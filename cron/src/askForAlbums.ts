import { LanguageModel } from "@effect/ai";
import { OpenRouterLanguageModel } from "@effect/ai-openrouter";
import { Effect, Schema } from "effect";
import { Database } from "shared";

const MODEL_ID = "perplexity/sonar-pro:online";

const SonarProOnline = OpenRouterLanguageModel.model(MODEL_ID);

const Album = Schema.Struct({
	title: Schema.String,
	artist: Schema.String,
	blurb: Schema.String,
	genres: Schema.Array(Schema.String),
});
export type Album = Schema.Schema.Type<typeof Album>;

const responseSchema = Schema.Struct({
	albums: Schema.Array(Album),
});

const prompt = `
Search the web for new albums released in the week. Return a list of these new albums with a blurb for each, mentioning what reviewers are saying.
I'm interested in both super popular music (in which case it doesn't need to be reviewed well) and very highly rated music from any genre

In particular, I'm interested in new pop, hiphop, and electronic genres. But well reviewed albums in any genre are worth mentioning.

Pay extra attention to reviews from theneedledrop on youtube, stereofox, and pitchfork
`;

export const askForAlbums = Effect.fn("askForAlbums")(function* () {
	const db = yield* Database;

	const response = yield* LanguageModel.generateObject({
		prompt: [
			{
				role: "user",
				content: [
					{
						type: "text",
						text: prompt,
					},
				],
			},
		],
		schema: responseSchema,
	}).pipe(Effect.provide(SonarProOnline));

	const aiResponseId = yield* db.insertAiResponse({
		prompt,
		outputSchema: responseSchema.toString(),
		model: MODEL_ID,
		output: JSON.stringify(response.value),
	});

	yield* Effect.annotateCurrentSpan({ aiResponseId });

	return {
		aiResponseId,
		albums: response.value.albums,
	};
});
