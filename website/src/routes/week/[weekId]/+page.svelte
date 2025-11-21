<script lang="ts">
	import AlbumWithBlurb from "../../AlbumWithBlurb.svelte";
	import Header from "../../Header.svelte";

	export let data;
</script>

<div class="mobile-container">
	<Header>
		<div class="week-id">{data.weekId}</div>
		<a href="/about" class="about-link">about</a>
	</Header>

	{#if data.neighbors.previousWeekId || data.neighbors.nextWeekId}
		<nav class="week-nav">
			{#if data.neighbors.previousWeekId}
				<a href="/week/{data.neighbors.previousWeekId}">← previous</a>
			{:else}
				<div></div>
			{/if}

			{#if data.neighbors.nextWeekId}
				<a href="/week/{data.neighbors.nextWeekId}">next →</a>
			{:else}
				<div></div>
			{/if}
		</nav>
	{/if}

	<main>
		{#if !data.suggestions}
			<p>no suggestions yet...</p>
		{:else}
			{#each data.suggestions.albums as album}
				<AlbumWithBlurb
					name={album.name}
					artists={album.artists}
					blurb={album.blurb}
					imageUrl={album.images.medium}
					spotifyUrl={album.spotifyUrl}
					appleMusicUrl={album.appleMusicUrl}
					tidalUrl={album.tidalUrl}
				/>
			{/each}
		{/if}
	</main>
</div>

<style>
	.mobile-container {
		padding: theme(spacing.4);
		min-height: 100vh;
		max-width: 50rem;
		margin: auto;
	}

	.week-id {
		font-size: 1.25rem;
		font-weight: 500;
	}

	.about-link {
		text-decoration: underline;
	}

	.week-nav {
		display: flex;
		justify-content: space-between;
		margin-top: calc(theme(spacing.6) * -1 + theme(spacing.2));
		margin-bottom: theme(spacing.6);
		font-size: 0.9rem;
	}

	.week-nav a:hover {
		text-decoration: underline;
	}

	main {
		max-width: 100%;
	}
</style>
