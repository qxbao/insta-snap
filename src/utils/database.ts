import { Dexie, EntityTable, type Table } from "dexie";
import { createLogger, Logger } from "./logger";
import { UserNode } from "../types/instapi";

const CHECKPOINT_INTERVAL = 20;

class Database extends Dexie {
  userMetadata!: EntityTable<UserMetadata, "id">;
  snapshots!: Table<SnapshotData, number>;
  crons!: Table<SnapshotCron, string>;
  logger?: Logger;

  constructor() {
    super("InstaSnapDB");
    this.version(1).stores({
      userMetadata: "id, username",
      snapshots: "++id, belongToId, [belongToId+timestamp]",
      crons: "uid, lastRun",
    });

    this.version(2)
      .stores({
        snapshots:
          "++id, belongToId, [belongToId+timestamp], [belongToId+isCheckpoint+timestamp]",
      })
      .upgrade(async (tx) => {
        return await tx
          .table("snapshots")
          .toCollection()
          .modify((snap) => {
            snap.isCheckpoint = snap.isCheckpoint ? 1 : 0;
          });
      });
    this.logger = createLogger("DexieDB");
    this.userMetadata = this.table("userMetadata");
    this.snapshots = this.table("snapshots");
    this.crons = this.table("crons");
  }

  async saveSnapshot(
    uid: string,
    timestamp: number,
    followerIds: string[],
    followingIds: string[],
  ): Promise<number> {
    return this.transaction("rw", this.snapshots, async () => {
      const lastSnapshot = await this.snapshots
        .where("[belongToId+timestamp]")
        .between([uid, Dexie.minKey], [uid, Dexie.maxKey])
        .last();

      const snapshotsCount = await this.snapshots
        .where("belongToId")
        .equals(uid)
        .count();

      const isCheckpoint = snapshotsCount % CHECKPOINT_INTERVAL === 0;

      // First snapshot or checkpoint: store complete data
      if (isCheckpoint || !lastSnapshot) {
        return this.snapshots.add({
          belongToId: uid,
          isCheckpoint: 1,
          timestamp,
          followers: { add: followerIds, rem: [] },
          following: { add: followingIds, rem: [] },
        });
      }

      // Else, store delta - diff
      const lastFollowers = new Set(lastSnapshot.followers.add || []);
      const currentFollowers = new Set(followerIds);

      const record: SnapshotData = {
        belongToId: uid,
        timestamp,
        isCheckpoint: 0,
        followers: {
          add: followerIds.filter((id) => !lastFollowers.has(id)),
          rem: Array.from(lastFollowers).filter(
            (id) => !currentFollowers.has(id),
          ),
        },
        following: {
          add: followingIds.filter(
            (id) => !new Set(lastSnapshot.following.add).has(id),
          ),
          rem: (lastSnapshot.following.add || []).filter(
            (id) => !new Set(followingIds).has(id),
          ),
        },
      };

      return this.snapshots.add(record);
    });
  }

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
        .between([uid, 1, Dexie.minKey], [uid, 1, maxTimestamp])
        .last();

      if (!lastCheckpoint) return new Set();

      const uSet = new Set(
        isFollowers
          ? lastCheckpoint.followers.add
          : lastCheckpoint.following.add,
      );

      const deltas = await this.snapshots
        .where("[belongToId+isCheckpoint+timestamp]")
        .between(
          [uid, 0, lastCheckpoint.timestamp],
          [uid, 0, maxTimestamp],
          false,
          true,
        )
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

  async getAllTrackedUsersWithMetadata(): Promise<
    Array<{
      userId: string;
      username: string;
      full_name: string;
      profile_pic_url: string;
      snapshotCount: number;
      lastSnapshot: number | null;
      last_updated: number;
    }>
  > {
    const userIds = (await this.snapshots
      .orderBy("belongToId")
      .uniqueKeys()) as string[];

    return Promise.all(
      userIds.map(async (userId) => {
        const metadata = await this.userMetadata.get(userId);

        const snapshotCount = await this.snapshots
          .where("belongToId")
          .equals(userId)
          .count();

        const lastSnapshotRecord = await this.snapshots
          .where("[belongToId+timestamp]")
          .between([userId, Dexie.minKey], [userId, Dexie.maxKey])
          .last();

        return {
          userId,
          username: metadata?.username || "Unknown",
          full_name: metadata?.fullName || "",
          profile_pic_url: metadata?.avatarURL || "",
          snapshotCount,
          lastSnapshot: lastSnapshotRecord?.timestamp || null,
          last_updated: metadata?.updatedAt || 0,
        };
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
    const snapshots = await this.snapshots
      .where("belongToId")
      .equals(uid)
      .sortBy("timestamp");

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

  async saveCron(
    uid: string,
    interval: number,
    lastRun: number = 0,
  ): Promise<void> {
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
}

const database = new Database();

export { database };
