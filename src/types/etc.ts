export type HistoryEntry = {
  timestamp: number;
  isCheckpoint: boolean;
  addedCount: number;
  removedCount: number;
  totalCount?: number;
};
