export enum Status {
  SyncDone = "SyncDone",
  SnapshotComplete = "isnap-snapshot-complete",

}

export interface ExtensionMessageResponse {
  status: Status;
  payload?: any;
}