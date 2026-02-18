import { Dexie, EntityTable, type Table } from "dexie";
import { createLogger, Logger } from "./logger";
import { UserNode } from "../types/instapi";
import { Encryptor } from "./encrypt";

const CHECKPOINT_INTERVAL = 20;

class Database extends Dexie {
  userMetadata!: EntityTable<UserMetadata, "id">;
  snapshots!: Table<SnapshotData, number>;
  crons!: Table<SnapshotCron, string>;
  internalConfig!: Table<InternalConfig, string>;
  logger?: Logger;

  constructor() {
    super("InstaSnapDB");
    this.version(1).stores({
      userMetadata: "id, username",
      snapshots: "++id, belongToId, [belongToId+timestamp]",
      crons: "uid, lastRun",
      internalConfig: "key",
    });
    // eslint-disable-next-line no-magic-numbers
    this.version(2)
      .stores({
        snapshots: "++id, belongToId, [belongToId+timestamp], [belongToId+isCheckpoint+timestamp]",
      })
      .upgrade(async (tx) => {
        return await tx
          .table("snapshots")
          .toCollection()
          .modify((snap) => {
            snap.isCheckpoint = snap.isCheckpoint ? 1 : 0;
          });
      });
    // eslint-disable-next-line no-magic-numbers
    this.version(3).stores({
      internalConfig: "key",
    });

    this.internalConfig = this.table("internalConfig");
    this.logger = createLogger("DexieDB");
    this.userMetadata = this.table("userMetadata");
    this.snapshots = this.table("snapshots");
    this.crons = this.table("crons");
  }

  /**
   * Save a snapshot of followers and following for a user at a specific timestamp.
   * @param uid The user ID to whom the snapshot belongs.
   * @param timestamp The timestamp of the snapshot.
   * @param followerIds Array of follower IDs.
   * @param followingIds Array of following IDs.
   * @returns Promise<number> The ID of the inserted snapshot record
   */
  async saveSnapshot(
    uid: string,
    timestamp: number,
    followerIds: string[],
    followingIds: string[],
  ): Promise<number> {
    return this.transaction("rw", this.snapshots, async () => {
      const lastCheckpoint = await this.snapshots
        .where("[belongToId+isCheckpoint+timestamp]")
        .between([uid, 1, Dexie.minKey], [uid, 1, timestamp])
        .last();

      const snapshotsSinceCheckpoint = await this.snapshots
        .where("[belongToId+timestamp]")
        .between(
          [uid, lastCheckpoint ? lastCheckpoint.timestamp : Dexie.minKey],
          [uid, timestamp],
          false, // include upper bound
          true, // include lower bound
        )
        .count();

      const isNewCheckpoint = snapshotsSinceCheckpoint >= CHECKPOINT_INTERVAL || !lastCheckpoint;

      if (isNewCheckpoint) {
        return this.snapshots.add({
          belongToId: uid,
          timestamp,
          isCheckpoint: 1,
          followers: { add: followerIds, rem: [] },
          following: { add: followingIds, rem: [] },
        });
      }

      const relevantSnapshots = await this.snapshots
        .where("[belongToId+timestamp]")
        .between([uid, lastCheckpoint.timestamp], [uid, timestamp], true, true)
        .sortBy("timestamp");

      const previousFollowers = new Set<string>();
      const previousFollowing = new Set<string>();

      for (const s of relevantSnapshots) {
        if (s.isCheckpoint) {
          previousFollowers.clear();
          previousFollowing.clear();
          s.followers.add.forEach((id) => previousFollowers.add(id));
          s.following.add.forEach((id) => previousFollowing.add(id));
        } else {
          s.followers.add?.forEach((id) => previousFollowers.add(id));
          s.followers.rem?.forEach((id) => previousFollowers.delete(id));
          s.following.add?.forEach((id) => previousFollowing.add(id));
          s.following.rem?.forEach((id) => previousFollowing.delete(id));
        }
      }

      const currentFollowers = new Set(followerIds);
      const currentFollowing = new Set(followingIds);

      const record = {
        belongToId: uid,
        timestamp,
        isCheckpoint: 0,
        followers: {
          add: followerIds.filter((id) => !previousFollowers.has(id)),
          rem: Array.from(previousFollowers).filter((id) => !currentFollowers.has(id)),
        },
        following: {
          add: followingIds.filter((id) => !previousFollowing.has(id)),
          rem: Array.from(previousFollowing).filter((id) => !currentFollowing.has(id)),
        },
      };

      return this.snapshots.add(record);
    });
  }

  /**
   * Delete a snapshot and all subsequent snapshots for the same user until the next checkpoint. This is used to maintain data integrity when a snapshot is deleted, ensuring that any dependent delta snapshots are also removed.
   * @param id The ID of the snapshot to delete
   * @returns Promise<void>
   */
  async deleteSnapshot(id: number): Promise<void> {
    return this.transaction("rw", this.snapshots, async () => {
      const target = await this.snapshots.get(id);
      if (!target) return;

      const idsToDelete: number[] = [];
      let stopFound = false;

      await this.snapshots
        .where("[belongToId+timestamp]")
        .between([target.belongToId, target.timestamp], [target.belongToId, Dexie.maxKey])
        .each((snapshot) => {
          if (stopFound) return;

          if (snapshot.id === id || !snapshot.isCheckpoint) {
            idsToDelete.push(snapshot.id!);
          } else if (snapshot.isCheckpoint && snapshot.id !== id) {
            stopFound = true;
          }
        });

      if (idsToDelete.length > 0) {
        await this.snapshots.bulkDelete(idsToDelete);
        this.logger?.info(`Deleted ${idsToDelete.length} records.`);
      }
    });
  }

  /**
   * bulkUpsertUserMetadata takes a list of user nodes and performs a bulk upsert operation to store their metadata in the database.
   * It filters out invalid user nodes that lack essential information (like id or username) and constructs an array of valid UserMetadata objects.
   * @param users: List of user node
   * @returns Promise<void>
   */
  async bulkUpsertUserMetadata(users: UserNode[]): Promise<void> {
    return this.transaction("rw", this.userMetadata, async () => {
      const now = Date.now();
      const validUsers = users.reduce((acc: UserMetadata[], user) => {
        if (user.id && user.username) {
          acc.push({
            id: user.id,
            username: user.username,
            fullName: user.full_name || "",
            avatarURL: user.profile_pic_url || "",
            updatedAt: now,
          });
        }
        return acc;
      }, []);
      await this.userMetadata.bulkPut(validUsers);
    });
  }

  async getFullList(
    uid: string,
    upToTimestamp?: number,
    isFollowers: boolean = true,
  ): Promise<Set<string>> {
    const maxTimestamp = upToTimestamp ?? Date.now();

    return await this.transaction("r", [this.snapshots], async () => {
      const lastCheckpoint = await this.snapshots
        .where("[belongToId+isCheckpoint+timestamp]")
        .between([uid, 1, Dexie.minKey], [uid, 1, maxTimestamp], false, true) // Point to the checkpoint timestamp
        .last();

      if (!lastCheckpoint) return new Set();

      const uSet = new Set(
        isFollowers ? lastCheckpoint.followers.add : lastCheckpoint.following.add,
      );

      const deltas = await this.snapshots
        .where("[belongToId+isCheckpoint+timestamp]")
        .between([uid, 0, lastCheckpoint.timestamp], [uid, 0, maxTimestamp], false, true)
        .toArray();

      for (const delta of deltas) {
        const changes = isFollowers ? delta.followers : delta.following;
        changes.add?.forEach((id) => uSet.add(id));
        changes.rem?.forEach((id) => uSet.delete(id));
      }
      return uSet;
    });
  }

  async getAllTrackedUsers(): Promise<Array<string>> {
    const users = await this.snapshots.orderBy("belongToId").uniqueKeys();
    return users as Array<string>;
  }

  async getAllTrackedUsersWithMetadata(): Promise<Array<TrackedUser>> {
    const userIds = (await this.snapshots.orderBy("belongToId").uniqueKeys()) as string[];

    return Promise.all(
      userIds.map(async (userId) => {
        const metadata = await this.userMetadata.get(userId);

        const snapshotCount = await this.snapshots.where("belongToId").equals(userId).count();

        const lastSnapshotRecord = await this.snapshots
          .where("[belongToId+timestamp]")
          .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
          .last();

        return {
          id: userId,
          username: metadata?.username || "Unknown",
          fullName: metadata?.fullName || "",
          avatarURL: metadata?.avatarURL || "",
          snapshotCount,
          lastSnapshot: lastSnapshotRecord?.timestamp || null,
          updatedAt: metadata?.updatedAt || 0,
        } satisfies TrackedUser;
      }),
    );
  }

  async getSnapshotHistory(
    uid: string,
    isFollowers: boolean = true,
  ): Promise<
    Array<{
      timestamp: number;
      isCheckpoint: boolean;
      addedCount: number;
      removedCount: number;
      totalCount?: number;
    }>
  > {
    const snapshots = await this.snapshots.where("belongToId").equals(uid).sortBy("timestamp");

    return snapshots.map((snapshot) => {
      const data = isFollowers ? snapshot.followers : snapshot.following;
      return {
        timestamp: snapshot.timestamp,
        isCheckpoint: snapshot.isCheckpoint == 1,
        addedCount: data.add?.length || 0,
        removedCount: data.rem?.length || 0,
        totalCount: snapshot.isCheckpoint == 1 ? data.add?.length || 0 : undefined,
      };
    });
  }

  async getCron(uid: string): Promise<SnapshotCron | undefined> {
    return this.crons.get(uid);
  }

  async getAllCrons(): Promise<SnapshotCron[]> {
    const crons = await this.crons.toArray();
    return crons;
  }

  async saveCron(uid: string, interval: number, lastRun: number = 0): Promise<void> {
    await this.crons.put({ uid, interval, lastRun });
  }

  async deleteCron(uid: string): Promise<void> {
    await this.crons.delete(uid);
  }

  async deleteUserData(uid: string): Promise<void> {
    return this.transaction("rw", [this.snapshots, this.crons], async () => {
      await this.snapshots.where("belongToId").equals(uid).delete();
      await this.crons.where("uid").equals(uid).delete();
    });
  }

  async readEncryptedConfig(key: string, encryptor?: Encryptor): Promise<string | null> {
    const config = await this.internalConfig.get(key);
    if (!config) return null;
    if (config.value && typeof config.value === "object" && "encrypted" in config.value) {
      const key = await this.internalConfig.get("encryptionKey");
      encryptor = encryptor || new Encryptor(key?.value as CryptoKey);
      return encryptor.decrypt(config.value.encrypted, new Uint8Array(config.value.iv));
    }
    return config.value as string;
  }

  async writeEncryptedConfig(key: string, value: string, encryptor?: Encryptor): Promise<void> {
    const encryptionKey = await this.internalConfig.get("encryptionKey");
    if (!encryptionKey) {
      throw new Error("Encryption key not available");
    }
    encryptor = encryptor || new Encryptor(encryptionKey.value as CryptoKey);
    const { encrypted, iv } = await encryptor.encrypt(value);
    await this.internalConfig.put({
      key,
      value: {
        encrypted,
        iv,
      } satisfies EncryptedData,
    });
  }
}

const database = new Database();

export { database };
