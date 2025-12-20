import { Config, ConfigProvider, Effect, Layer, Redacted } from "effect";
import { PlatformConfigProvider } from "@effect/platform";
import { BunFileSystem } from "@effect/platform-bun";
import { $ } from "bun";

const DeployConfig = Config.all({
	TURSO_DATABASE_URL: Config.redacted("TURSO_DATABASE_URL"),
	TURSO_AUTH_TOKEN: Config.redacted("TURSO_AUTH_TOKEN"),
	CLOUDFLARE_ACCOUNT_ID: Config.redacted("CLOUDFLARE_ACCOUNT_ID"),
	CLOUDFLARE_API_TOKEN: Config.redacted("CLOUDFLARE_API_TOKEN"),
});

const DotEnvLayer = PlatformConfigProvider.layerDotEnv(".env.production").pipe(
	Layer.provide(BunFileSystem.layer),
);

const isCI = process.env.CI === "true";

const withConfig = isCI
	? Effect.withConfigProvider(ConfigProvider.fromEnv())
	: Effect.provide(DotEnvLayer);

const exec = (cmd: string, cwd?: string) =>
	Effect.tryPromise({
		try: async () => {
			console.log(`Running: ${cmd}${cwd ? ` (in ${cwd})` : ""}`);
			await $`${{ raw: cmd }}`.cwd(cwd ?? ".");
		},
		catch: (error) => new Error(`Command failed: ${cmd}\n${error}`),
	});

const program = Effect.gen(function* () {
	console.log(
		isCI ? "Using environment variables (CI mode)" : "Using .env.production",
	);

	const config = yield* DeployConfig;
	Object.entries(config).forEach(([key, val]) => {
		process.env[key] = Redacted.value(val);
	});
	console.log("✓ Environment variables validated");

	console.log("\n→ Running database migrations...");
	yield* exec("bun run db:migrate", "shared");
	console.log("✓ Migrations complete");

	console.log("\n→ Deploying website...");
	yield* exec("bun run deploy", "website");
	console.log("✓ Website deployed");

	console.log("\n→ Deploying cron...");
	yield* exec("bun run deploy", "cron");
	console.log("✓ Cron deployed");

	console.log("\n✓ Deploy complete!");
}).pipe(withConfig);

Effect.runPromise(program).catch((error) => {
	console.error("\n✗ Deploy failed:", error.message);
	process.exit(1);
});
