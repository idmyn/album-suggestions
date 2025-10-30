import { Temporal } from "@js-temporal/polyfill";

export function weekIdFromDate(date: Date): string {
	const instant = Temporal.Instant.from(date.toISOString());
	const plainDate = instant.toZonedDateTimeISO("UTC").toPlainDate();
	const plainDateISO = plainDate.withCalendar("iso8601");
	return `${plainDateISO.yearOfWeek!}W${plainDateISO.weekOfYear!.toString().padStart(2, "0")}`;
}

export function currentWeekId(): string {
	return weekIdFromDate(new Date());
}
