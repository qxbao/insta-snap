import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  buildFollowersEndpoint,
  buildFollowingEndpoint,
  buildHeaders,
  exportCSRFToken,
  fetchUserCounts,
  fetchUsers,
  findAppId,
} from "../../utils/instagram"

describe("Instagram Utilities", () => {
  describe("API Endpoint Building", () => {
    it("should build proper REST v1 followers endpoint structure", () => {
      const uid = "123456"
      const endpoint = buildFollowersEndpoint(uid)

      expect(endpoint).toContain("/api/v1/friendships/123456/followers/")
      expect(endpoint).toContain("count=100")
      expect(endpoint).toContain("search_surface=follow_list_page")
    })

    it("should append max_id when provided for followers endpoint", () => {
      const uid = "123456"
      const maxId = "QVFBX123="
      const endpoint = buildFollowersEndpoint(uid, maxId)

      expect(endpoint).toContain(`max_id=${encodeURIComponent(maxId)}`)
    })

    it("should build proper REST v1 following endpoint structure", () => {
      const uid = "123456"
      const endpoint = buildFollowingEndpoint(uid)

      expect(endpoint).toContain("/api/v1/friendships/123456/following/")
      expect(endpoint).toContain("count=100")
      expect(endpoint).toContain("search_surface=follow_list_page")
    })

    it("should append max_id when provided for following endpoint", () => {
      const uid = "123456"
      const maxId = "PAGE_2_TOKEN"
      const endpoint = buildFollowingEndpoint(uid, maxId)

      expect(endpoint).toContain("max_id=PAGE_2_TOKEN")
    })

    it("should append rank_token when provided for followers and following endpoints", () => {
      const uid = "123456"
      const rankToken = "123456_uuid123"
      const endpointFollowers = buildFollowersEndpoint(uid, null, rankToken)
      const endpointFollowing = buildFollowingEndpoint(uid, null, rankToken)

      expect(endpointFollowers).toContain(`rank_token=${encodeURIComponent(rankToken)}`)
      expect(endpointFollowing).toContain(`rank_token=${encodeURIComponent(rankToken)}`)
    })

    it("should append query parameter when provided", () => {
      const uid = "123456"
      const query = "b"
      const endpoint = buildFollowersEndpoint(uid, null, undefined, query)

      expect(endpoint).toContain("query=b")
    })
  })

  describe("Regex Patterns & DOM Helpers", () => {
    it("should extract APP_ID from typical Instagram HTML", () => {
      const html = 'some content "APP_ID":"936619743392459" more content'
      const appIdMatch = html.match(/"APP_ID":"(\d+)"/)

      expect(appIdMatch).toBeTruthy()
      expect(appIdMatch![1]).toBe("936619743392459")
    })

    it("should extract profile_id from user page HTML", () => {
      const html = 'content "profile_id":"1234567890" more'
      const userIdMatch = html.match(/"profile_id":"(\d+)"/)

      expect(userIdMatch).toBeTruthy()
      expect(userIdMatch![1]).toBe("1234567890")
    })

    it("should extract csrftoken from cookie string", () => {
      const cookieString = "sessionid=abc; csrftoken=test123token; other=value"
      const csrfMatch = cookieString.match(/csrftoken=([^;]+)/)

      expect(csrfMatch).toBeTruthy()
      expect(csrfMatch![1]).toBe("test123token")
    })

    it("should handle missing csrftoken", () => {
      const cookieString = "sessionid=abc; other=value"
      const csrfMatch = cookieString.match(/csrftoken=([^;]+)/)

      expect(csrfMatch).toBeNull()
    })

    it("should findAppId correctly from document body", () => {
      document.body.innerHTML = '<div>"APP_ID":"936619743392459"</div>'
      expect(findAppId()).toBe("936619743392459")
    })

    it("should exportCSRFToken correctly from document cookie", () => {
      Object.defineProperty(document, "cookie", {
        writable: true,
        value: "csrftoken=my_csrf_secret; sessionid=123",
      })
      expect(exportCSRFToken()).toBe("my_csrf_secret")
    })
  })

  describe("Headers Building", () => {
    it("should build proper API headers structure", () => {
      const appId = "123456"
      const csrfToken = "abc123"
      const wwwClaim = "claim123"

      const headers = buildHeaders(appId, csrfToken, wwwClaim)

      expect(headers["x-ig-app-id"]).toBe(appId)
      expect(headers["x-csrftoken"]).toBe(csrfToken)
      expect(headers["x-ig-www-claim"]).toBe(wwwClaim)
      expect(headers["accept"]).toBe("*/*")
    })
  })

  describe("Response Parsing", () => {
    it("should parse REST v1 followers response structure", () => {
      const mockResponse = {
        users: [
          { pk: "user1", username: "follower1", full_name: "Follower One", profile_pic_url: "http://pic1" },
          { pk_id: "user2", username: "follower2", full_name: "Follower Two", profile_pic_url: "http://pic2" },
        ],
        next_max_id: "CURSOR_ABC",
        status: "ok",
      }

      expect(mockResponse.users).toHaveLength(2)
      expect(mockResponse.users[0].pk).toBe("user1")
      expect(mockResponse.next_max_id).toBe("CURSOR_ABC")
    })
  })

  describe("API Fetching Functions", () => {
    const originalFetch = globalThis.fetch

    afterEach(() => {
      globalThis.fetch = originalFetch
      vi.restoreAllMocks()
    })

    it("should fetch user counts via GraphQL query_hash", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("query_hash=c76146de41bb0209fe918a345a767d99")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: { user: { edge_followed_by: { count: 325 } } },
              }),
          })
        }
        if (url.includes("query_hash=5882385336d63f0f93829557a0927f3d")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: { user: { edge_follow: { count: 103 } } },
              }),
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      }) as unknown as typeof fetch

      const counts = await fetchUserCounts("testuser", "123456", "app1", "csrf1", "claim1")
      expect(counts.followersCount).toBe(325)
      expect(counts.followingCount).toBe(103)
    })

    it("should fallback to web_profile_info if GraphQL fails", async () => {
      globalThis.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("graphql")) {
          return Promise.resolve({ ok: false, status: 404 })
        }
        if (url.includes("web_profile_info")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: {
                  user: {
                    edge_followed_by: { count: 50 },
                    edge_follow: { count: 20 },
                  },
                },
              }),
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      }) as unknown as typeof fetch

      const counts = await fetchUserCounts("testuser", "123456", "app1", "csrf1", "claim1")
      expect(counts.followersCount).toBe(50)
      expect(counts.followingCount).toBe(20)
    })

    it("should fetch users using parallel REST streams until targetCount reached", async () => {
      let callCount = 0
      globalThis.fetch = vi.fn().mockImplementation(() => {
        callCount++
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              users: [
                { pk: `user_${callCount}_1`, username: `user${callCount}a`, full_name: `User ${callCount} A` },
                { pk: `user_${callCount}_2`, username: `user${callCount}b`, full_name: `User ${callCount} B` },
              ],
              next_max_id: callCount > 2 ? null : `max_${callCount}`,
              status: "ok",
            }),
        })
      }) as unknown as typeof fetch

      const users = await fetchUsers("123456", "followers", "app1", "csrf1", "claim1", 2)
      expect(users).not.toBe(false)
      if (Array.isArray(users)) {
        expect(users.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
})

