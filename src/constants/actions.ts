export enum ActionType {
  TAKE_SNAPSHOT = "isnap-take-snap",
  GET_USER_INFO = "isnap-get-user-info",
  SYNC_LOCKS = "isnap-sync-locks",
}

export interface ExtensionMessage {
  type: ActionType;
  payload?: any;
}