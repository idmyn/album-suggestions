import { run } from "./src/main";

run().catch((error) => {
	console.error(error);
	process.exit(1);
});
