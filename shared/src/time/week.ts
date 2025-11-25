import { Temporal } from "@js-temporal/polyfill";

export function weekIdFromDate(date: Date): string {
	const instant = Temporal.Instant.from(date.toISOString());
	const plainDate = instant.toZonedDateTimeISO("UTC").toPlainDate();
	const plainDateISO = plainDate.withCalendar("iso8601");
	return `${plainDateISO.yearOfWeek!}W${plainDateISO.weekOfYear!.toString().padStart(2, "0")}`;
}

export function currentSuggestionWeekId(): string {
	const now = new Date();
	const instant = Temporal.Instant.from(now.toISOString());
	const zonedDateTime = instant.toZonedDateTimeISO("UTC");

	// If it's before Friday 0000 UTC, use previous week
	if (zonedDateTime.dayOfWeek < 5) {
		const previousWeek = zonedDateTime.subtract({ days: 7 }).toPlainDate();
		const plainDateISO = previousWeek.withCalendar("iso8601");
		return `${plainDateISO.yearOfWeek!}W${plainDateISO.weekOfYear!.toString().padStart(2, "0")}`;
	}

	return weekIdFromDate(now);
}
