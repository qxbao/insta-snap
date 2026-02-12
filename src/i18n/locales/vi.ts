import { EnglishLocale } from "./en";

export const VietnameseLocale = {
  metadata: {
    short_name: "InstaSnap",
    full_name: "InstaSnap - Quản lý hồ sơ Instagram",
    desc: "Theo dõi hồ sơ Instagram, phát hiện người bỏ theo dõi/theo dõi mới, và phân tích xu hướng tăng trưởng qua các snapshot thông minh, chỉ lưu trữ cục bộ.",
    short_desc: "Dễ dàng theo dõi và quản lý hồ sơ Instagram.",
  },
  popup: {
    profile: "Hồ sơ Instagram",
    no_profile_recommend: "Mở một hồ sơ Instagram để sử dụng tính năng này.",
    open_dashboard: "Mở bảng điều khiển",
    status: {
      processing: "Đang xử lý",
      syncing: "Đang đồng bộ",
      ready: "Chụp snapshot",
    },
    metadata: {
      title: "Thông tin hồ sơ",
      total_snapshots: "Snapshot đã lưu",
      never: "Chưa bao giờ",
      last_snapshot: "Snapshot cuối",
    },
    configurations: {
      title: "Cấu hình",
      automatic_snapshots: "Tự động chụp snapshot",
      interval: "Khoảng cách mỗi lần (đơn vị: giờ)",
    },
  },
  dashboard: {
    main: {
      confirm: {
        delete_snapshot: "Bạn có chắc muốn xóa tất cả dữ liệu của người dùng này? Hành động này cũng sẽ xóa các tác vụ tự động của người dùng và không thể hoàn tác.",
        delete_cron: "Bạn có chắc muốn xóa tác vụ tự động này? Hành động này không thể hoàn tác.",
      },
      status: {
        refreshing: "Đang tải...",
        refresh: "Làm mới",
      },
      migration: {
        checking: "Đang kiểm tra migration...",
        title_complete: "Migration hoàn tất!",
        title_available: "Có dữ liệu cần Migration",
        checking_message: "Đang kiểm tra xem có cần migration dữ liệu không...",
        description: "Phát hiện dữ liệu snapshot cũ trong chrome.storage. Chuyển sang IndexedDB...",
        start_button: "Bắt đầu Migration",
        migrating_button: "Đang migrate...",
        success: "Migration hoàn tất thành công!",
        stats: {
          users: "Đã migrate {count} hồ sơ người dùng",
          snapshots: "Đã migrate {count} snapshots",
          crons: "Đã migrate {count} tác vụ tự động",
        },
        errors: "Migration hoàn tất với một số lỗi:",
      },
      no_snapshots: "Chưa có snapshot nào",
      no_snapshots_desc: "Bắt đầu theo dõi hồ sơ Instagram để xem snapshot ở đây.",
      view_details: "Xem chi tiết",
      heading: {
        tracked_profiles: "Hồ sơ theo dõi",
        total_snapshot: "Snapshot đã lưu",
        active_today: "Hoạt động hôm nay",
      },
      cronjob: {
        title: "Snapshot tự động",
        desc: "Tự động chụp snapshot theo khoảng thời gian định sẵn",
        interval: "Khoảng thời gian",
        interval_w_unit: "Khoảng thời gian (đơn vị: giờ)",
        last_run: "Lần chạy cuối",
        add_schedule: "Thêm tác vụ",
        no_cron_recommend: "Chưa có tác vụ tự động nào. Nhấn \"Thêm tác vụ\" để tạo mới.",
        interval_required: "Khoảng thời gian là bắt buộc",
        interval_min_er: "Khoảng thời gian phải ít nhất 1 giờ",
        interval_max_er: "Khoảng thời gian không được vượt quá 168 giờ (1 tuần)",
        select_user_er: "Vui lòng chọn một hồ sơ dùng cho tác vụ tự động",
        edit_schedule: "Chỉnh sửa tác vụ",
        select_user: "Chọn người dùng",
        interval_rec: "Khuyến nghị: 12-24 giờ",
        interval_max: "Tối đa: 168 giờ",
        interval_note:
          "Snapshot sẽ được tự động chụp mỗi {time} nếu tiện ích hoạt động.",
      },
    },
    details: {
      title: "Thông tin hồ sơ",
      subtitle: "Xem lịch sử snapshot và phân tích",
      show_charts: "Hiển thị biểu đồ",
      tabs: {
        overview: "Tổng quan",
        followers_history: "Người theo dõi",
        following_history: "Đang theo dõi",
      },
      chart: {
        followers_label: "Người theo dõi",
        following_label: "Đang theo dõi",
        no_data: "Không có dữ liệu để hiển thị biểu đồ",
      },
      failed_to_load: "Không thể tải thông tin người dùng",
      header: {
        view_on_instagram: "Xem trên Instagram",
        user_id: "ID người dùng",
      },
      stats: {
        total_snapshots: "Tổng số snapshot",
        checkpoints: "Checkpoint",
        current_followers: "Followers hiện tại",
        current_following: "Following hiện tại",
      },
      history: {
        snapshot_timeline: "Lịch sử snapshot",
        followers_changes: "Lịch sử followers",
        following_changes: "Lịch sử following",
        checkpoint: "Checkpoint",
        analyze: "Phân tích",
        delta: "Delta",
        total: "Tổng",
        no_changes: "Không có thay đổi trong snapshot này",
      },
      changes: {
        new_followers: "Followers mới",
        followers_gone: "Đã bị huỷ follow bởi",
        new_following: "Following mới",
        following_gone: "Đã huỷ follow",
        load_more: "Tải thêm",
        load_all: "Tải tất cả",
      },
      analysis: {
        title: "Phân tích Snapshot",
        subtitle: "Trạng thái mối quan hệ tại thời điểm snapshot này",
        followers_not_followed_back: "Follower đơn phương",
        following_not_following_back: "Following đơn phương",
        no_data: "Không có dữ liệu phân tích",
        close: "Đóng",
      },
    },
  },
  content: {
    snapshot: {
      taking_snapshot: "Đang chụp snapshot",
      dont_leave_page: "Vui lòng tạm thời không rời khỏi trang...",
      progress: "Đã tải {loaded} {target}",
    },
  },
  background: {
    error: {
      app_data_missing: "AppID bị thiếu, không thể xử lý các đăng ký snapshot.",
      processing_user: "Đang xử lý cron snapshot cho người dùng: {userId}",
    }
  },
  errors: {
    undetected_profile: "Không phát hiện",
  },
} satisfies typeof EnglishLocale;
