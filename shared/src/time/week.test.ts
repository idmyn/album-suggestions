import { describe, test, expect } from "bun:test";
import { weekIdFromDate, currentWeekId } from "./week-utils";

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

describe("currentWeekId", () => {
	test("returns normalized week ID", () => {
		const weekId = currentWeekId();
		expect(weekId).toMatch(/^\d{4}W\d{2}$/);
	});
});
