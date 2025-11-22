<script lang="ts">
	import Header from "../Header.svelte";
</script>

<div class="container">
	<Header>
		<h1 class="uppercase">about</h1>
		<a href="/">home</a>
	</Header>

	<main>
		<p>
			I had a 'skill' (saved prompt) in <a
				href="https://www.diabrowser.com"
				target="_blank"
				rel="noopener noreferrer">dia</a
			> which would recommend me some recently released albums. When I stopped using
			dia I still occasionally wanted to run that prompt, so I'd open dia and run
			it.
		</p>
		<p>
			That felt silly so I decided to find a new home for it, and figured it
			should be pretty easy to build a little project which ran the prompt on a
			regular schedule and nicely displayed the results... And now you're
			looking at it!
		</p>
		<p>A couple of notes on the implementation, in case you're interested:</p>
		<ul class="list-disc pl-5 mb-4 space-y-1">
			<li>the prompt is sent to Perplexity via OpenRouter</li>
			<li>
				I use the <a href="https://effect.website/docs/ai/introduction/"
					>Effect AI</a
				> package for this
			</li>
			<li>
				this is a small program which is deployed to Cloudflare Workers and runs
				on a schedule
			</li>
			<li>the frontend is a very simple SvelteKit application</li>
			<li>I worked on it with <a href="https://ampcode.com/">Amp</a></li>
			<li>
				you can check out
				<a
					href="https://github.com/idmyn/album-suggestions"
					rel="noopener noreferrer"
					target="_blank">the source code on GitHub</a
				>
			</li>
		</ul>
	</main>
</div>

<style>
	.container {
		padding: theme(spacing.4);
		min-height: 100vh;
		max-width: 50rem;
		margin: auto;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 500;
	}

	a {
		text-decoration: underline;
	}

	p {
		line-height: 1.5;
		+ p {
			margin-top: theme(space.3);
		}
		+ ul {
			margin-top: theme(space.1);
		}
	}
</style>
