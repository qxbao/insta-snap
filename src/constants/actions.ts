export enum ActionType {
  TAKE_SNAPSHOT = "isnap-take-snap",
  GET_USER_INFO = "isnap-get-user-info",
}

export interface ExtensionMessage {
  type: ActionType;
  payload?: any;
}