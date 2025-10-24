<script lang="ts">
  import { getLatestAlbumSuggestions } from './data.remote';
  import AlbumSummaryCard from './AlbumSummaryCard.svelte';

  const suggestions = await getLatestAlbumSuggestions();
</script>

<main class="px-24 pt-12">
  <h1 class="text-4xl font-bold mb-8">Album suggestions</h1>

  {#if !suggestions}
  	<p>no suggestions yet...</p>
  {:else}
  	<div class="max-w-3xl">
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
