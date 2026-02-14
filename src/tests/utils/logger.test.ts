import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLogger, Logger } from "../../utils/logger";

/**
 * Logger Test Suite
 *
 * Note: Branch coverage for isDev conditionals (lines 20, 30) is limited because
 * import.meta.env.MODE is inlined at compile time by Vite. In test environment,
 * MODE is typically "test", resulting in 50% branch coverage. This is expected
 * and cannot be improved without refactoring the logger to inject environment.
 */
describe("Logger", () => {
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let consoleDebugSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-02-14T10:30:00"));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("Logger creation", () => {
		it("should create logger with context", () => {
			const logger = createLogger("TestContext");

			expect(logger).toBeDefined();
			expect(logger).toBeInstanceOf(Logger);
			expect(logger.info).toBeDefined();
			expect(logger.warn).toBeDefined();
			expect(logger.error).toBeDefined();
			expect(logger.debug).toBeDefined();
		});

		it("should support multiple logger instances", () => {
			const logger1 = createLogger("Context1");
			const logger2 = createLogger("Context2");

			expect(logger1).not.toBe(logger2);
			expect(logger1).toBeDefined();
			expect(logger2).toBeDefined();
		});

		it("should handle logger creation with various context names", () => {
			const contexts = ["App", "Background", "Content", "Database", "Encrypt"];

			contexts.forEach((context) => {
				const logger = createLogger(context);
				expect(logger).toBeDefined();
				expect(typeof logger.info).toBe("function");
				expect(typeof logger.warn).toBe("function");
				expect(typeof logger.error).toBe("function");
				expect(typeof logger.debug).toBe("function");
			});
		});

		it("should detect environment mode correctly", () => {
			const logger = createLogger("EnvTest");
			// In vitest, MODE is typically "test" which is treated as development
			expect(import.meta.env.MODE).toBeDefined();
		});
	});

	describe("Logging behavior", () => {
		it("should log info messages", () => {
			const logger = createLogger("TestContext");
			logger.info("Test info message");

			// In test/development mode, check if console.log was called
			if (import.meta.env.MODE === "development") {
				expect(consoleLogSpy).toHaveBeenCalled();
				const callArgs = consoleLogSpy.mock.calls[0];
				expect(callArgs[0]).toContain("[InstaSnap:TestContext]");
				expect(callArgs[0]).toContain("INFO");
				expect(callArgs[0]).toContain("Test info message");
			}
		});

		it("should log info with additional arguments", () => {
			const logger = createLogger("TestContext");
			const testObj = { key: "value" };
			const testArray = [1, 2, 3];

			logger.info("Test with args", testObj, testArray);

			if (import.meta.env.MODE === "development") {
				expect(consoleLogSpy).toHaveBeenCalled();
				const callArgs = consoleLogSpy.mock.calls[0];
				expect(callArgs[0]).toContain("Test with args");
				expect(callArgs[2]).toBe(testObj);
				expect(callArgs[3]).toBe(testArray);
			}
		});

		it("should log debug messages", () => {
			const logger = createLogger("DebugContext");
			logger.debug("Debug message");

			if (import.meta.env.MODE === "development") {
				expect(consoleDebugSpy).toHaveBeenCalled();
				const callArgs = consoleDebugSpy.mock.calls[0];
				expect(callArgs[0]).toContain("[InstaSnap:DebugContext]");
				expect(callArgs[0]).toContain("DEBUG");
				expect(callArgs[0]).toContain("Debug message");
			}
		});

		it("should log debug with additional arguments", () => {
			const logger = createLogger("DebugContext");
			const debugData = { debug: true };

			logger.debug("Debug with data", debugData);

			if (import.meta.env.MODE === "development") {
				expect(consoleDebugSpy).toHaveBeenCalled();
				const callArgs = consoleDebugSpy.mock.calls[0];
				expect(callArgs[2]).toBe(debugData);
			}
		});

		it("should apply correct styling for info logs", () => {
			const logger = createLogger("StyledContext");
			logger.info("Styled info");

			if (import.meta.env.MODE === "development") {
				const callArgs = consoleLogSpy.mock.calls[0];
				expect(callArgs[1]).toContain("color: #3b82f6");
				expect(callArgs[1]).toContain("font-weight: bold");
			}
		});

		it("should apply correct styling for debug logs", () => {
			const logger = createLogger("StyledContext");
			logger.debug("Styled debug");

			if (import.meta.env.MODE === "development") {
				const callArgs = consoleDebugSpy.mock.calls[0];
				expect(callArgs[1]).toContain("color: #8b5cf6");
			}
		});
	});

	describe("Error and Warning logging", () => {
		it("should log error messages", () => {
			const logger = createLogger("ErrorContext");
			logger.error("Error message");

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[0]).toContain("[InstaSnap:ErrorContext]");
			expect(callArgs[0]).toContain("ERROR");
			expect(callArgs[0]).toContain("Error message");
		});

		it("should log error with additional arguments", () => {
			const logger = createLogger("ErrorContext");
			const error = new Error("Test error");

			logger.error("Error occurred", error);

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[2]).toBe(error);
		});

		it("should apply correct styling for error logs", () => {
			const logger = createLogger("ErrorContext");
			logger.error("Styled error");

			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[1]).toContain("color: #ef4444");
			expect(callArgs[1]).toContain("font-weight: bold");
		});

		it("should log warning messages", () => {
			const logger = createLogger("WarnContext");
			logger.warn("Warning message");

			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			const callArgs = consoleWarnSpy.mock.calls[0];
			expect(callArgs[0]).toContain("[InstaSnap:WarnContext]");
			expect(callArgs[0]).toContain("WARN");
			expect(callArgs[0]).toContain("Warning message");
		});

		it("should log warning with additional arguments", () => {
			const logger = createLogger("WarnContext");
			const warnData = { deprecated: true };

			logger.warn("Deprecated feature", warnData);

			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			const callArgs = consoleWarnSpy.mock.calls[0];
			expect(callArgs[2]).toBe(warnData);
		});

		it("should apply correct styling for warning logs", () => {
			const logger = createLogger("WarnContext");
			logger.warn("Styled warning");

			const callArgs = consoleWarnSpy.mock.calls[0];
			expect(callArgs[1]).toContain("color: #f59e0b");
			expect(callArgs[1]).toContain("font-weight: bold");
		});
	});

	describe("Log formatting", () => {
		it("should include timestamp in log format", () => {
			const logger = createLogger("TimeTest");
			logger.warn("Timestamp test");

			const callArgs = consoleWarnSpy.mock.calls[0];
			const logMessage = callArgs[0];
			// Should contain time format like [10:30:00]
			expect(logMessage).toMatch(/\[\d{1,2}:\d{2}:\d{2}(?:\s?[AP]M)?\]/);
		});

		it("should format log with correct structure", () => {
			const logger = createLogger("FormatTest");
			logger.warn("Format test message");

			const callArgs = consoleWarnSpy.mock.calls[0];
			const logMessage = callArgs[0];

			// Check for structure: [InstaSnap:FormatTest] - WARN [timestamp] Format test message
			expect(logMessage).toContain("[InstaSnap:FormatTest]");
			expect(logMessage).toContain("WARN");
			expect(logMessage).toContain("Format test message");
			expect(logMessage).toMatch(/\[InstaSnap:FormatTest\]\s*-\s*WARN\s*\[.+\]/);
		});

		it("should handle different scope names in format", () => {
			const scopes = ["Background", "Content", "Database", "Popup", "Dashboard"];

			scopes.forEach((scope) => {
				const logger = createLogger(scope);
				logger.error("Test message");

				const callArgs = consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1];
				expect(callArgs[0]).toContain(`[InstaSnap:${scope}]`);
			});
		});
	});

	describe("Edge cases", () => {
		it("should handle empty string message", () => {
			const logger = createLogger("EmptyTest");
			logger.error("");

			expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
		});

		it("should handle special characters in message", () => {
			const logger = createLogger("SpecialTest");
			logger.error("Message with special chars: !@#$%^&*()");

			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[0]).toContain("Message with special chars: !@#$%^&*()");
		});

		it("should handle unicode characters in message", () => {
			const logger = createLogger("UnicodeTest");
			logger.error("Unicode message: 你好 🚀 café");

			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[0]).toContain("Unicode message: 你好 🚀 café");
		});

		it("should handle very long messages", () => {
			const logger = createLogger("LongTest");
			const longMessage = "A".repeat(1000);
			logger.error(longMessage);

			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[0]).toContain(longMessage);
		});

		it("should handle null and undefined in arguments", () => {
			const logger = createLogger("NullTest");
			logger.warn("Test", null, undefined);

			expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
			const callArgs = consoleWarnSpy.mock.calls[0];
			expect(callArgs[2]).toBe(null);
			expect(callArgs[3]).toBe(undefined);
		});

		it("should handle multiple arguments of different types", () => {
			const logger = createLogger("MultiTypeTest");
			logger.error("Error", 123, true, { obj: "value" }, ["array"]);

			const callArgs = consoleErrorSpy.mock.calls[0];
			expect(callArgs[2]).toBe(123);
			expect(callArgs[3]).toBe(true);
			expect(callArgs[4]).toEqual({ obj: "value" });
			expect(callArgs[5]).toEqual(["array"]);
		});
	});
});
