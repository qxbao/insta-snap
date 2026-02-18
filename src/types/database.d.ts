interface UserMetadata {
  id: string;
  username: string;
  fullName: string;
  avatarURL: string;
  updatedAt: number;
}

interface SnapshotData {
  id?: number;
  belongToId: string;
  isCheckpoint: number;
  timestamp: number;
  followers: {
    add: string[];
    rem: string[];
  };
  following: {
    add: string[];
    rem: string[];
  };
}

interface SnapshotCron {
  uid: string;
  interval: number;
  lastRun: number;
}

type EncryptedData = { encrypted: ArrayBuffer; iv: Uint8Array<ArrayBufferLike> };

interface InternalConfig {
  key: string;
  value: string | number | boolean | CryptoKey | EncryptedData;
}
