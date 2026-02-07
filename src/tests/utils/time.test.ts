import { describe, expect, it } from "vitest";
import { useTimeFormat } from "../../utils/time";

describe("useTimeFormat", () => {
  const { formatRelativeTime, formatDate, formatIntervalTime } =
    useTimeFormat();

  describe("formatRelativeTime", () => {
    it("should return 'Never' for null timestamp", () => {
      expect(formatRelativeTime(null)).toBe("Never");
    });

    it("should return 'Just now' for very recent timestamp", () => {
      const now = Date.now();
      expect(formatRelativeTime(now)).toBe("Just now");
      expect(formatRelativeTime(now - 30000)).toBe("Just now"); // 30 seconds ago
    });

    it("should return minutes for timestamps less than 1 hour ago", () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 60000)).toBe("1m ago"); // 1 minute
      expect(formatRelativeTime(now - 1800000)).toBe("30m ago"); // 30 minutes
      expect(formatRelativeTime(now - 3540000)).toBe("59m ago"); // 59 minutes
    });

    it("should return hours for timestamps less than 24 hours ago", () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 3600000)).toBe("1h ago"); // 1 hour
      expect(formatRelativeTime(now - 7200000)).toBe("2h ago"); // 2 hours
      expect(formatRelativeTime(now - 82800000)).toBe("23h ago"); // 23 hours
    });

    it("should return days for timestamps more than 24 hours ago", () => {
      const now = Date.now();
      expect(formatRelativeTime(now - 86400000)).toBe("1d ago"); // 1 day
      expect(formatRelativeTime(now - 172800000)).toBe("2d ago"); // 2 days
      expect(formatRelativeTime(now - 604800000)).toBe("7d ago"); // 7 days
    });
  });

  describe("formatDate", () => {
    it("should return 'Never' for null timestamp", () => {
      expect(formatDate(null)).toBe("Never");
    });

    it("should format timestamp as locale string", () => {
      const timestamp = new Date("2024-01-15T10:30:00").getTime();
      const expected = new Date(timestamp).toLocaleString();
      expect(formatDate(timestamp)).toBe(expected);
    });
  });

  describe("formatIntervalTime", () => {
    it("should format hours less than 24", () => {
      expect(formatIntervalTime(1)).toBe("1h");
      expect(formatIntervalTime(12)).toBe("12h");
      expect(formatIntervalTime(23)).toBe("23h");
    });

    it("should format exactly 24 hours as days", () => {
      expect(formatIntervalTime(24)).toBe("1d");
      expect(formatIntervalTime(48)).toBe("2d");
      expect(formatIntervalTime(168)).toBe("7d");
    });

    it("should format mixed days and hours", () => {
      expect(formatIntervalTime(25)).toBe("1d 1h");
      expect(formatIntervalTime(36)).toBe("1d 12h");
      expect(formatIntervalTime(72)).toBe("3d");
      expect(formatIntervalTime(73)).toBe("3d 1h");
    });
  });
});
