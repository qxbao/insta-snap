/**
 * @deprecated: This file is deprecated and served its purpose for migration only.
 */

type UserID = string
type Timestamp = number

/**
 * A global map of user metadata for quick reference.
 * Key: "users_metadata"
 */
export type GlobalUserMap = Record<
  string,
  {
    username: string
    full_name: string
    profile_pic_url: string
    last_updated: Timestamp
  }
>

// Key: "meta_{targetId}"
export interface UserSnapshotMeta {
  targetId: string
  checkpoints: Timestamp[]
  logTimeline: Timestamp[]
}

// Key: "data_{targetId}_{timestamp}"
export interface SnapshotRecord {
  isCheckpoint: boolean
  // Checkpoint: Store all
  // Delta: Store diff
  followers: {
    add?: UserID[]
    rem?: UserID[]
  }
  following: {
    add?: UserID[]
    rem?: UserID[]
  }
}
