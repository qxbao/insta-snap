export type InstagramAPIHeader = {
  'accept': string; // */*
  'accept-language': string; // vi,en-GB;q=0.9,en-US;q=0.8,en;q=0.7,ru;q=0.6
  'x-ig-www-claim': string;
  'x-ig-app-id': string;
  'x-csrftoken': string;
  'sec-fetch-dest': string; // empty
  'sec-fetch-mode': string; // cors
  'sec-fetch-site': string; // same-origin
}

export type InstagramRequestType<T extends "followers" | "following"> = T extends 'followers' ? InstagramFollowersResponse : InstagramFollowingsResponse;

export interface InstagramFollowersResponse {
  data: FollowerData
  status: string
}

export interface InstagramFollowingsResponse{
  data: FollowingData
  status: string
}

export interface FollowingData {
  user: UserGetFollowings
}

export interface FollowerData {
  user: UserGetFollowers
}

export interface UserGetFollowings {
  edge_follow: EdgeFollow
  edge_mutual_followed_by: EdgeMutualFollowedBy
}

export interface UserGetFollowers {
  edge_followed_by: EdgeFollow
  edge_mutual_followed_by: EdgeMutualFollowedBy
}

export interface EdgeFollow {
  count: number
  page_info: PageInfo
  edges: Edge[]
}

export interface PageInfo {
  has_next_page: boolean
  end_cursor: string
}

export interface Edge {
  node: Node
}

export interface Node {
  id: string
  username: string
  full_name: string
  profile_pic_url: string
  is_private: boolean
  is_verified: boolean
  followed_by_viewer: boolean
  requested_by_viewer: boolean
}

export interface Owner {
  __typename: string
  id: string
  profile_pic_url: string
  username: string
}

export interface EdgeMutualFollowedBy {
  count: number
  edges: Edge2[]
}

export interface Edge2 {
  node: Node2
}

export interface Node2 {
  id: string
  username: string
  full_name: string
  profile_pic_url: string
  is_private: boolean
  is_verified: boolean
  followed_by_viewer: boolean
  requested_by_viewer: boolean
}

export interface Owner2 {
  __typename: string
  id: string
  profile_pic_url: string
  username: string
}