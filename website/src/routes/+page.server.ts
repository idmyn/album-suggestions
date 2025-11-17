import { redirect } from "@sveltejs/kit";
import { currentSuggestionWeekId } from "shared";

export const load = () => {
	redirect(307, `/week/${currentSuggestionWeekId()}`);
};
