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

	main {
		max-width: 100%;
	}
</style>
