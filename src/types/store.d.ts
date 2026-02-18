interface TrackedUser extends UserMetadata {
  snapshotCount: number
  lastSnapshot: number | null
}
