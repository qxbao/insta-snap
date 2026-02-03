export enum Status {
  SyncDone = "SyncDone",
  SnapshotComplete = "isnap-snapshot-complete",
  Done = "Done",
}

export interface ExtensionMessageResponse<T = any> {
  status: Status;
  payload?: T;
}