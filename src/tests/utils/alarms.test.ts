import { describe, it, expect } from "vitest";
import { getJitter } from "../../utils/alarms";

describe("Alarm Utilities", () => {
	describe("getJitter", () => {
		it("should return a number within specified range", () => {
			const base = 1000;
			const maxJitter = 100;
			const result = getJitter(base, maxJitter);

			expect(result).toBeGreaterThanOrEqual(base);
			expect(result).toBeLessThan(base + maxJitter);
		});

		it("should return different values on multiple calls", () => {
			const base = 1000;
			const maxJitter = 1000;
			const jitters = Array.from({ length: 10 }, () =>
				getJitter(base, maxJitter)
			);

			// At least some values should be different
			const uniqueValues = new Set(jitters);
			expect(uniqueValues.size).toBeGreaterThan(1);
		});

		it("should handle small max jitter values", () => {
			const base = 100;
			const maxJitter = 1;
			const result = getJitter(base, maxJitter);

			expect(result).toBeGreaterThanOrEqual(base);
			expect(result).toBeLessThan(base + maxJitter);
		});

		it("should handle zero jitter", () => {
			const base = 1000;
			const maxJitter = 0;
			const result = getJitter(base, maxJitter);

			expect(result).toBe(base);
		});

		it("should handle large jitter values", () => {
			const base = 5000;
			const maxJitter = 10000;
			const result = getJitter(base, maxJitter);

			expect(result).toBeGreaterThanOrEqual(base);
			expect(result).toBeLessThan(base + maxJitter);
		});

		it("should produce values close to uniform distribution", () => {
			const samples = 1000;
			const base = 1000;
			const maxJitter = 1000;
			const jitters = Array.from({ length: samples }, () =>
				getJitter(base, maxJitter)
			);

			// Check that values spread across the range
			const inFirstHalf = jitters.filter((j) => j < base + maxJitter / 2).length;
			const inSecondHalf = jitters.filter(
				(j) => j >= base + maxJitter / 2
			).length;

			// Should have roughly similar counts (within 20% tolerance)
			const ratio = inFirstHalf / samples;
			expect(ratio).toBeGreaterThan(0.3);
			expect(ratio).toBeLessThan(0.7);

			expect(inSecondHalf).toBeGreaterThan(0);
			expect(inFirstHalf).toBeGreaterThan(0);
		});
	});
});
