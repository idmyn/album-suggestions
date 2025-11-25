import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { Database } from "shared";
import { Effect, Option } from "effect";
import { effectQuery } from "$lib/effect";

export const load: PageServerLoad = async ({ params }) => {
	const weekId = params.weekId;

	if (!/^\d{4}W\d{2}$/.test(weekId)) {
		error(404, "Invalid week");
	}

	const { suggestions, neighbors } = await effectQuery(() =>
		Effect.gen(function* () {
			const db = yield* Database;
			const result = yield* db.getSuggestionsByWeekId(weekId);
			const allWeekIds = yield* db.getAllWeekIds();
			const weekIndex = allWeekIds.indexOf(weekId);
			return {
				suggestions: Option.getOrNull(result),
				neighbors: {
					previousWeekId: weekIndex > 0 ? allWeekIds[weekIndex - 1] : null,
					nextWeekId:
						weekIndex < allWeekIds.length - 1
							? allWeekIds[weekIndex + 1]
							: null,
				},
			};
		}),
	)();

	if (!suggestions) {
		error(404, "Week not found");
	}

	return { weekId, suggestions, neighbors };
};
