export interface InstagramAPIHeader {
  'accept': string; // */*
  'accept-language': string; // vi,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6
  'x-ig-www-claim': string;
  'x-ig-app-id': string;
  'x-csrftoken': string;
  'sec-fetch-dest': string; // empty
  'sec-fetch-mode': string; // cors
  'sec-fetch-site': string; // same-origin
}

export interface InstagramFollowersResponse {
  users: User[];
  big_list: boolean;
  page_size: number;
  next_max_id: string;
  has_more: boolean;
  should_limit_list_of_followers: boolean;
  use_clickable_see_more: boolean;
  show_spam_follow_request_tab: boolean;
  follow_ranking_token: string;
  status: string;
}

export interface User {
  strong_id__: string;
  pk: string;
  pk_id: string;
  id: string;
  full_name?: string;
  fbid_v2: string;
  allowed_commenter_type?: string;
  reel_auto_archive?: string;
  third_party_downloads_enabled: number;
  profile_pic_id?: string;
  profile_pic_url: string;
  is_verified: boolean;
  username: string;
  is_private: boolean;
  has_anonymous_profile_picture: boolean;
  account_badges: any[];
  has_onboarded_to_text_post_app?: boolean;
  interop_messaging_user_fbid?: string;
  latest_reel_media: number;
}