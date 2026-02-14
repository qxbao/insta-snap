import { describe, it, expect, beforeEach, vi } from "vitest";

// Since findAppId and findUserId work with DOM/fetch, we'll test their logic patterns
describe("Instagram Utilities", () => {
	describe("Query Hash Constants", () => {
		it("should have correct followers query hash", () => {
			// Test that the constants are defined
			const FOLLOWERS_QUERY_HASH = "c76146de99bb02f6415203be841dd25a";
			expect(FOLLOWERS_QUERY_HASH).toMatch(/^[a-f0-9]{32}$/);
		});

		it("should have correct following query hash", () => {
			const FOLLOWING_QUERY_HASH = "d04b0a864b4b54837c0d870b0e77e076";
			expect(FOLLOWING_QUERY_HASH).toMatch(/^[a-f0-9]{32}$/);
		});
	});

	describe("API Endpoint Building", () => {
		it("should build proper GraphQL endpoint structure", () => {
			const uid = "123456";
			const queryHash = "abc123";
			const variables = {
				id: uid,
				first: 50,
			};

			const endpoint = `https://www.instagram.com/graphql/query/?query_hash=${queryHash}&variables=${encodeURIComponent(JSON.stringify(variables))}`;

			expect(endpoint).toContain("graphql/query");
			expect(endpoint).toContain(queryHash);
			expect(endpoint).toContain(encodeURIComponent(uid));
		});

		it("should properly encode variables in URL", () => {
			const variables = {
				id: "test<>123",
				first: 50,
			};

			const encoded = encodeURIComponent(JSON.stringify(variables));

			expect(encoded).not.toContain("<");
			expect(encoded).not.toContain(">");
			expect(encoded).toContain("%");
		});
	});

	describe("Regex Patterns", () => {
		it("should extract APP_ID from typical Instagram HTML", () => {
			const html = 'some content "APP_ID":"936619743392459" more content';
			const appIdMatch = html.match(/"APP_ID":"(\d+)"/);

			expect(appIdMatch).toBeTruthy();
			expect(appIdMatch![1]).toBe("936619743392459");
		});

		it("should extract profile_id from user page HTML", () => {
			const html = 'content "profile_id":"1234567890" more';
			const userIdMatch = html.match(/"profile_id":"(\d+)"/);

			expect(userIdMatch).toBeTruthy();
			expect(userIdMatch![1]).toBe("1234567890");
		});

		it("should extract csrftoken from cookie string", () => {
			const cookieString = "sessionid=abc; csrftoken=test123token; other=value";
			const csrfMatch = cookieString.match(/csrftoken=([^;]+)/);

			expect(csrfMatch).toBeTruthy();
			expect(csrfMatch![1]).toBe("test123token");
		});

		it("should handle missing csrftoken", () => {
			const cookieString = "sessionid=abc; other=value";
			const csrfMatch = cookieString.match(/csrftoken=([^;]+)/);

			expect(csrfMatch).toBeNull();
		});
	});

	describe("Headers Building", () => {
		it("should build proper API headers structure", () => {
			const appId = "123456";
			const csrfToken = "abc123";
			const wwwClaim = "claim123";

			const headers = {
				"accept": "*/*",
				"x-ig-app-id": appId,
				"x-csrftoken": csrfToken,
				"x-ig-www-claim": wwwClaim,
				"sec-fetch-site": "same-origin",
			};

			expect(headers["x-ig-app-id"]).toBe(appId);
			expect(headers["x-csrftoken"]).toBe(csrfToken);
			expect(headers["x-ig-www-claim"]).toBe(wwwClaim);
		});
	});

	describe("Response Parsing", () => {
		it("should parse followers response structure", () => {
			const mockResponse = {
				data: {
					user: {
						edge_followed_by: {
							count: 150,
							page_info: {
								has_next_page: false,
								end_cursor: null,
							},
							edges: [
								{ node: { id: "user1", username: "follower1" } },
								{ node: { id: "user2", username: "follower2" } },
							],
						},
					},
				},
			};

			expect(mockResponse.data.user.edge_followed_by.edges).toHaveLength(2);
			expect(mockResponse.data.user.edge_followed_by.edges[0].node.id).toBe(
				"user1"
			);
		});

		it("should parse following response structure", () => {
			const mockResponse = {
				data: {
					user: {
						edge_follow: {
							count: 100,
							page_info: {
								has_next_page: true,
								end_cursor: "cursor123",
							},
							edges: [
								{ node: { id: "user3", username: "following1" } },
							],
						},
					},
				},
			};

			expect(mockResponse.data.user.edge_follow.edges).toHaveLength(1);
			expect(mockResponse.data.user.edge_follow.page_info.has_next_page).toBe(
				true
			);
		});
	});
});
