import { mount } from "@vue/test-utils";
import { describe, expect, it, beforeEach } from "vitest";
import { createI18n } from "vue-i18n";
import UserCard from "../../dashboard/components/UserCard.vue";
import { EnglishLocale } from "../../i18n/locales/en";

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

	let i18n: ReturnType<typeof createI18n>;

	beforeEach(() => {
		i18n = createI18n({
			legacy: false,
			locale: "en",
			messages: {
				en: EnglishLocale,
			},
		});
	});

	it("renders user card component", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		expect(wrapper.exists()).toBe(true);
		expect(wrapper.find(".card").exists()).toBe(true);
	});

	it("displays user information correctly", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		expect(wrapper.text()).toContain("Test User");
		expect(wrapper.text()).toContain("@testuser");
	});

	it("displays snapshot count", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		expect(wrapper.text()).toContain("5");
		expect(wrapper.text()).toContain("Total snapshots");
	});

	it("renders avatar image with correct attributes", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const img = wrapper.find("img");
		expect(img.exists()).toBe(true);
		expect(img.attributes("src")).toBe(mockUser.avatarURL);
		expect(img.attributes("alt")).toBe(mockUser.username);
		expect(img.attributes("referrerpolicy")).toBe("no-referrer");
	});

	it("uses fallback avatar on image error", async () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const img = wrapper.find("img");
		await img.trigger("error");

		expect(img.element.src).toContain("/images/user_avatar.png");
	});

	it("uses fallback avatar when avatarURL is null", () => {
		const userWithoutAvatar = { ...mockUser, avatarURL: "" };
		const wrapper = mount(UserCard, {
			props: {
				user: userWithoutAvatar,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const img = wrapper.find("img");
		expect(img.attributes("src")).toBe("/images/user_avatar.png");
	});

	it("emits view-details event when view details button clicked", async () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		const viewDetailsBtn = buttons[0];
		await viewDetailsBtn.trigger("click");

		expect(wrapper.emitted("view-details")).toBeTruthy();
		expect(wrapper.emitted("view-details")?.[0]).toEqual(["12345"]);
	});

	it("emits open-profile event when open profile button clicked", async () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		const openProfileBtn = buttons[1];
		await openProfileBtn?.trigger("click");

		expect(wrapper.emitted("open-profile")).toBeTruthy();
		expect(wrapper.emitted("open-profile")?.[0]).toEqual(["testuser"]);
	});

	it("emits delete event when delete button clicked", async () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const deleteButton = wrapper.find(".text-red-700");
		await deleteButton.trigger("click");

		expect(wrapper.emitted("delete")).toBeTruthy();
		expect(wrapper.emitted("delete")?.[0]).toEqual(["12345"]);
	});

	it("displays username when fullName is empty", () => {
		const userWithoutFullName = { ...mockUser, fullName: "" };
		const wrapper = mount(UserCard, {
			props: {
				user: userWithoutFullName,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		expect(wrapper.text()).toContain("testuser");
	});

	it("displays last snapshot time with relative formatting", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		expect(wrapper.text()).toContain("Last snapshot at");
		// Time formatting should be present
		const lastSnapshotSection = wrapper.find(".grid.grid-cols-2");
		expect(lastSnapshotSection.exists()).toBe(true);
	});

	it("has hover effect on card", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const card = wrapper.find(".card");
		expect(card.classes()).toContain("hover:shadow-lg");
	});

	it("truncates long usernames and full names", () => {
		const userWithLongName = {
			...mockUser,
			username: "verylongusernamethatshouldbeetruncated",
			fullName: "Very Long Full Name That Should Be Truncated",
		};

		const wrapper = mount(UserCard, {
			props: {
				user: userWithLongName,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		expect(wrapper.find(".truncate").exists()).toBe(true);
	});

	it("has correct border styling on avatar", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const avatar = wrapper.find("img");
		expect(avatar.classes()).toContain("border-2");
		expect(avatar.classes()).toContain("border-emerald-500");
	});

	it("displays stats grid with correct layout", () => {
		const wrapper = mount(UserCard, {
			props: {
				user: mockUser,
			},
			global: {
				plugins: [i18n],
				stubs: {
					Fa6SolidArrowUpRightFromSquare: true,
					Fa6SolidMagnifyingGlassChart: true,
					Fa6SolidTrashCan: true,
				},
			},
		});

		const statsGrid = wrapper.find(".grid.grid-cols-2");
		expect(statsGrid.exists()).toBe(true);
		expect(statsGrid.findAll(".border-2").length).toBe(2);
	});
});
