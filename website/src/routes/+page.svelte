<script lang="ts">
	import { getLatestAlbumSuggestions } from "./data.remote";
	import AlbumSummaryCard from "./AlbumSummaryCard.svelte";

	const suggestions = await getLatestAlbumSuggestions();
</script>

<main class="w-fit mx-auto py-12">
	{#if !suggestions}
		<p>no suggestions yet...</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each suggestions.albums as album}
				<AlbumSummaryCard
					name={album.name}
					artists={album.artists}
					blurb={album.blurb}
					imageUrl={album.images.medium}
					spotifyUrl={album.spotifyUrl}
					tidalUrl={album.tidalUrl}
					appleMusicUrl={album.appleMusicUrl}
				/>
			{/each}
		</div>
	{/if}
</main>
