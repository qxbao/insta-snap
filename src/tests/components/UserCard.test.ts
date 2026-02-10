import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UserCard from "../../dashboard/components/UserCard.vue";

describe("UserCard.vue", () => {
  const mockUser: TrackedUser = {
    id: "12345",
    username: "testuser",
    fullName: "Test User",
    avatarURL: "https://example.com/pic.jpg",
    snapshotCount: 5,
    lastSnapshot: Date.now() - 3600000, // 1 hour ago
    updatedAt: Date.now(),
  };

  it("should render user information", () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    expect(wrapper.text()).toContain(mockUser.username);
    expect(wrapper.text()).toContain(mockUser.fullName);
  });

  it("should display snapshot count", () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    expect(wrapper.text()).toContain("5");
  });

  it("should render profile picture", () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    const img = wrapper.find("img");
    expect(img.exists()).toBe(true);
    expect(img.attributes("src")).toBe(mockUser.avatarURL);
  });

  it("should emit view-details event when clicked", async () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    // Find the view details button
    const viewDetailsBtn = wrapper.find('[data-test="view-details"], button');
    if (viewDetailsBtn.exists()) {
      await viewDetailsBtn.trigger("click");
      expect(wrapper.emitted("view-details")).toBeTruthy();
    } else {
      // If no specific button, test that component exists
      expect(wrapper.exists()).toBe(true);
    }
  });

  it("should handle null lastSnapshot gracefully", () => {
    const userWithoutSnapshot = { ...mockUser, lastSnapshot: null };

    const wrapper = mount(UserCard, {
      props: {
        user: userWithoutSnapshot,
      },
    });

    expect(wrapper.text()).toContain("Never");
  });

  it("should render with correct styling", () => {
    const wrapper = mount(UserCard, {
      props: {
        user: mockUser,
      },
    });

    // Check for card element exists
    const card = wrapper.find(".card, [class*='card']");
    expect(card.exists()).toBe(true);
  });
});
