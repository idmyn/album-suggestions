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
			Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
			tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
			veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
			commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
			velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat
			cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id
			est laborum.
		</p>
		<p>
			Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium
			doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo
			inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
			Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
			fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem
			sequi nesciunt.
		</p>
		<p>
			Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
			consectetur, adipisci velit, sed quia non numquam eius modi tempora
			incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad
			minima veniam, quis nostrum exercitationem ullam corporis suscipit
			laboriosam, nisi ut aliquid ex ea commodi consequatur?
		</p>
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
		margin-bottom: 1rem;
		line-height: 1.5;
	}
</style>
