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
    add?: string[];
    rem?: string[];
  };
  following: {
    add?: string[];
    rem?: string[];
  };
}

interface SnapshotCron {
  uid: string;
  interval: number;
  lastRun: number;
}