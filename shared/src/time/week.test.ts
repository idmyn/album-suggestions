import { describe, test, expect } from "bun:test";
import { weekIdFromDate, currentSuggestionWeekId } from "./week";

describe("weekIdFromDate", () => {
	test("converts date to ISO week format", () => {
		const date = new Date("2025-10-27T00:00:00Z");
		expect(weekIdFromDate(date)).toBe("2025W44");
	});

	test("handles dates at week boundaries", () => {
		const monday = new Date("2025-10-27T00:00:00Z");
		const sunday = new Date("2025-11-02T23:59:59Z");
		expect(weekIdFromDate(monday)).toBe("2025W44");
		expect(weekIdFromDate(sunday)).toBe("2025W44");
	});

	test("handles week 1 edge cases", () => {
		const jan1 = new Date("2025-01-01T00:00:00Z");
		expect(weekIdFromDate(jan1)).toBe("2025W01");
	});

	test("handles year transitions", () => {
		const dec29_2024 = new Date("2024-12-29T00:00:00Z");
		expect(weekIdFromDate(dec29_2024)).toBe("2024W52");
	});

	test("pads single-digit weeks", () => {
		const earlyYear = new Date("2025-01-06T00:00:00Z");
		expect(weekIdFromDate(earlyYear)).toBe("2025W02");
	});
});

describe("currentSuggestionWeekId", () => {
	test("returns previous week if before Friday 0000 UTC", () => {
		const thursday = new Date("2025-11-06T23:59:59Z");
		expect(weekIdFromDate(thursday)).toBe("2025W45");
	});

	test("returns current week if Friday or later", () => {
		const friday = new Date("2025-11-07T00:00:00Z");
		expect(weekIdFromDate(friday)).toBe("2025W45");
	});

	test("returns normalized week ID", () => {
		const weekId = currentSuggestionWeekId();
		expect(weekId).toMatch(/^\d{4}W\d{2}$/);
	});
});
