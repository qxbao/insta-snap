export enum ActionType {
  TAKE_SNAPSHOT = "isnap-take-snap",
  GET_USER_INFO = "isnap-get-user-info",
  SYNC_LOCKS = "isnap-sync-locks",
  NOTIFY_SNAPSHOT_COMPLETE = "isnap-notify-snapshot-complete",
  SEND_APP_DATA = "isnap-send-app-data",
  CHECK_SNAPSHOT_SUBSCRIPTIONS = "isnap-check-snapshot-subscriptions",
}

export interface ExtensionMessage {
  type: ActionType;
  payload?: any;
}