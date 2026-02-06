export enum Status {
  SyncDone = "SyncDone",
  SnapshotComplete = "isnap-snapshot-complete",
  Done = "Done",
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ExtensionMessageResponse<T = any> {
  status: Status;
  payload?: T;
}