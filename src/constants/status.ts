export enum Status {
  SyncDone = "isnap-sync-done",
  SnapshotComplete = "isnap-snapshot-complete",
  Done = "isnap-done",
  InProgress = "isnap-in-progress",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExtensionMessageResponse<T = any> {
  status: Status;
  payload?: T;
}
