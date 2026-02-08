export const EnglishLocale = {
  metadata: {
    short_name: "InstaSnap",
    full_name: "InstaSnap - Instagram Follower Tracker",
    desc: "Track Instagram followers, detect unfollowers, and analyze growth trends with secure, local-only snapshots.",
    short_desc: "Track and monitor Instagram profiles with ease.",
  },
  popup: {
    profile: "Profile",
    no_profile_recommend: "Open an Instagram profile page to use this feature.",
    open_dashboard: "Open dashboard",
    metadata: {
      title: "Profile Metadata",
      total_snapshots: "Total snapshots",
      never: "Never",
      last_snapshot: "Last snapshot at",
    },
    configurations: {
      title: "Configurations",
      automatic_snapshots: "Automatic snapshots at regular intervals",
      interval: "Interval (in hours)",
    },
    status: {
      processing: "Processing",
      syncing: "Syncing",
      ready: "Take snapshot",
    },
  },
  dashboard: {
    main: {
      confirm: {
        delete_snapshot:
          "Are you sure you want to delete all data for this user? This action will also delete user's cron jobs and cannot be undone.",
        delete_cron: "Are you sure you want to remove this cron job?",
      },
      status: {
        refreshing: "Refreshing...",
        refresh: "Refresh",
      },
      no_snapshots: "No snapshots yet",
      no_snapshots_desc:
        "Start tracking Instagram profiles to see snapshots here.",
      view_details: "View details",
      heading: {
        tracked_profiles: "Tracked Profiles",
        total_snapshot: "Total Snapshots",
        active_today: "Active Today",
      },
      cronjob: {
        title: "Scheduled Snapshots",
        desc: "Automatically capture snapshots at regular intervals",
        interval: "Interval",
        interval_w_unit: "Interval (in hours)",
        last_run: "Last run",
        add_schedule: "Add schedule",
        no_cron_recommend:
          'No scheduled snapshots yet. Click "Add schedule" to create one.',
        interval_required: "Interval is required",
        interval_min_er: "Interval must be at least 1 hour",
        interval_max_er: "Interval cannot exceed 168 hours (1 week)",
        select_user_er: "Please select a user for the cron job",
        edit_schedule: "Edit schedule",
        select_user: "Select User",
        interval_rec: "Recommended: 12-24 hours",
        interval_max: "Maximum: 168 hours",
        interval_note:
          "Snapshots will be automatically captured automatically every {time} when the extension is active.",
      },
    },
    details: {
      title: "User Details",
      subtitle: "View snapshot history and analytics",
      tabs: {
        overview: "Overview",
        followers_history: "Followers History",
        following_history: "Following History",
      },
      failed_to_load: "Failed to load user details",
      header: {
        view_on_instagram: "View on Instagram",
        user_id: "User ID",
      },
      stats: {
        total_snapshots: "Total Snapshots",
        checkpoints: "Checkpoints",
        current_followers: "Current Followers",
        current_following: "Current Following",
      },
      history: {
        snapshot_timeline: "Snapshot timeline",
        followers_changes: "Followers changes",
        following_changes: "Following changes",
        checkpoint: "Checkpoint",
        delta: "Delta",
        total: "Total",
        no_changes: "No changes in this snapshot",
      },
      changes: {
        new_followers: "New followers",
        followers_gone: "Followers gone",
        new_following: "New following",
        following_gone: "Following gone",
        load_more: "Load more",
        load_all: "Load all",
      },
    },
  },
  content: {
    snapshot: {
      taking_snapshot: "Taking snapshot",
      dont_leave_page: "For a while, please don't leave this page",
      progress: "Loaded {loaded} of {target} users",
    },
  },
  background: {
    error: {
      app_data_missing:
        "App data missing, cannot process snapshot subscriptions.",
      processing_user: "Processing snapshot cron for user: {userId}",
    },
  },
  errors: {
    undetected_profile: "Undetected",
  },
};
