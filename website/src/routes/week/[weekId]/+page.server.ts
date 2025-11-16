import { error } from "@sveltejs/kit";
import { Database } from "shared";
import { Effect, Option } from "effect";
import { effectQuery } from "$lib/effect";

export const load = async ({ params }) => {
	const weekId = params.weekId;

	if (!/^\d{4}W\d{2}$/.test(weekId)) {
		error(404, "Invalid week");
	}

	const suggestions = await effectQuery(() =>
		Effect.gen(function* () {
			const db = yield* Database;
			const result = yield* db.getSuggestionsByWeekId(weekId);
			return Option.getOrNull(result);
		}),
	)();

	if (!suggestions) {
		error(404, "Week not found");
	}

	return { weekId, suggestions };
};
