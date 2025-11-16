import { redirect } from "@sveltejs/kit";
import { currentWeekId } from "shared";

export const load = () => {
	redirect(307, `/week/${currentWeekId()}`);
};
