<script lang="ts">
	import AlbumWithBlurb from "../../AlbumWithBlurb.svelte";

	export let data;
</script>

<div class="flex">
	<nav>
		<div class="text-xl font-medium">{data.weekId}</div>
		<div class="about-link">
			<a href="/about">about</a>
		</div>
	</nav>

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
	nav {
		margin-left: 20vw;
		position: sticky;
		top: 10vh;
		height: 80vh;
		padding-right: theme(spacing.9);
		margin-right: theme(spacing.9);
		border-right: 1px solid black;

		display: flex;
		flex-direction: column;
		justify-content: space-between;
		text-align: right;
	}

	.about-link a {
		text-decoration: underline;
	}

	main {
		padding: theme(spacing.14) 0;
		max-width: 40rem;
	}
</style>
