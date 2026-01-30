import { run } from "./src/main";

export default {
	async scheduled(event, env, ctx): Promise<void> {
		await run(env, ctx);
	},
} satisfies ExportedHandler<Env>;
