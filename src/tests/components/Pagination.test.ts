import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import Pagination from "../../dashboard/components/Pagination.vue";

describe("Pagination.vue", () => {
	it("renders pagination buttons", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 1,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		// 2 navigation buttons + 5 page buttons
		expect(buttons.length).toBe(7);
	});

	it("emits go-to-page event when page button clicked", async () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 1,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const pageButtons = wrapper.findAll("button").slice(1, -1);
		await pageButtons[2].trigger("click");

		expect(wrapper.emitted("go-to-page")).toBeTruthy();
		expect(wrapper.emitted("go-to-page")?.[0]).toEqual([3]);
	});

	it("emits go-to-page on previous button click", async () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 3,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const prevButton = wrapper.findAll("button")[0];
		await prevButton.trigger("click");

		expect(wrapper.emitted("go-to-page")).toBeTruthy();
		expect(wrapper.emitted("go-to-page")?.[0]).toEqual([2]);
	});

	it("emits go-to-page on next button click", async () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 3,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		const nextButton = buttons[buttons.length - 1];
		await nextButton?.trigger("click");

		expect(wrapper.emitted("go-to-page")).toBeTruthy();
		expect(wrapper.emitted("go-to-page")?.[0]).toEqual([4]);
	});

	it("disables previous button on first page", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 1,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const prevButton = wrapper.findAll("button")[0];
		expect(prevButton.attributes("disabled")).toBeDefined();
	});

	it("disables next button on last page", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 5,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		const nextButton = buttons[buttons.length - 1];
		expect(nextButton?.attributes("disabled")).toBeDefined();
	});

	it("highlights current page button", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 3,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const pageButtons = wrapper.findAll("button").slice(1, -1);
		const currentPageButton = pageButtons[2];

		expect(currentPageButton.classes()).toContain("theme-btn");
	});

	it("does not highlight non-current page buttons", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 3,
				totalPages: 5,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const pageButtons = wrapper.findAll("button").slice(1, -1);
		const firstPageButton = pageButtons[0];

		expect(firstPageButton.classes()).not.toContain("theme-btn");
		expect(firstPageButton.classes()).toContain("bg-gray-100");
	});

	it("renders with single page", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 1,
				totalPages: 1,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const buttons = wrapper.findAll("button");
		expect(buttons.length).toBe(3); // prev + 1 page + next
	});

	it("applies correct styling to page buttons", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 1,
				totalPages: 3,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		const pageButtons = wrapper.findAll("button").slice(1, -1);
		pageButtons.forEach((button) => {
			expect(button.classes()).toContain("px-4");
			expect(button.classes()).toContain("py-2");
			expect(button.classes()).toContain("rounded-lg");
		});
	});

	it("handles edge case with zero pages gracefully", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 1,
				totalPages: 0,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		// Should at least render navigation buttons
		expect(wrapper.findAll("button").length).toBeGreaterThanOrEqual(2);
	});

	it("handles large page numbers", () => {
		const wrapper = mount(Pagination, {
			props: {
				currentPage: 50,
				totalPages: 100,
			},
			global: {
				stubs: {
					Fa6SolidChevronLeft: true,
					Fa6SolidChevronRight: true,
				},
			},
		});

		// Should render 2 navigation + 100 page buttons
		expect(wrapper.findAll("button").length).toBe(102);
	});
});
