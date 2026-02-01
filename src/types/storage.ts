// Key: "users_metadata"
export interface GlobalUserMap {
  [pk: string]: {
    username: string;
    full_name: string;
    profile_pic_url: string;
    last_updated: number;
  }
}

// Key: "meta_{targetId}"
export interface UserSnapshotMeta {
  targetId: string;
  checkpoints: number[]; // Danh sách các timestamp là bản full (Baseline)
  logTimeline: number[]; // Tất cả các mốc thời gian đã fetch
}

// Key: "data_{targetId}_{timestamp}"
export interface SnapshotRecord {
  isCheckpoint: boolean;
  // Nếu là checkpoint: lưu toàn bộ ID
  // Nếu là delta: lưu sự thay đổi
  followers: {
    add?: string[]; // Chỉ lưu ID (string)
    rem?: string[]; 
  };
  following: {
    add?: string[];
    rem?: string[];
  };
}