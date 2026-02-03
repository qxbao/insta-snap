export enum ActionType {
  TAKE_SNAPSHOT = "isnap-take-snap",
  GET_USER_INFO = "isnap-get-user-info",
  SYNC_LOCKS = "isnap-sync-locks",
  NOTIFY_SNAPSHOT_COMPLETE = "isnap-notify-snapshot-complete",
}

export interface ExtensionMessage {
  type: ActionType;
  payload?: any;
}