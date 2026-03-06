import { run } from "../src/main";

run().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
