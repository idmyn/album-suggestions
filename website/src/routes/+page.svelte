<script lang="ts">
	import { getLatestAlbumSuggestions } from "./data.remote";
	import AlbumWithBlurb from "./AlbumWithBlurb.svelte";

	const suggestions = await getLatestAlbumSuggestions();
</script>

<main class="page-container">
	<div class="left-column">
		<div class="text-xl font-medium">2025W43</div>
		<div class="about-link">
			<a href="/about">about</a>
		</div>
	</div>

	<div class="divider h-full"></div>

	<div class="content-column overflow-y-auto">
		{#if !suggestions}
			<p>no suggestions yet...</p>
		{:else}
			{#each suggestions.albums as album}
				<AlbumWithBlurb
					name={album.name}
					artists={album.artists}
					blurb={album.blurb}
					imageUrl={album.images.medium}
				/>
			{/each}
		{/if}
	</div>
</main>

<style>
	.page-container {
		display: grid;
		grid-template-columns: 10vw 1px 2fr;
		gap: 3rem;
		max-width: 85rem;
		margin: 0 auto;
		padding: 3rem 2rem;
		height: 100vh;
	}

	.left-column {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		text-align: right;
	}

	.about-link a {
		text-decoration: underline;
	}

	.divider {
		background-color: #000;
		width: 1px;
		margin: 0;
	}

	.content-column {
		padding-top: 0.5rem;
	}
</style>
