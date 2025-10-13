import { run } from "./src/main";
import { sharedFn } from "shared";

export default {
  async scheduled(event, env, ctx): Promise<void> {
    await run(env);
    const fromShared = sharedFn();
    console.log(`from shared: ${fromShared}`);
  },
} satisfies ExportedHandler<Env>;
