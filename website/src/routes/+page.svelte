<script lang="ts">
  import { getLatestAlbumSuggestions } from './albumSuggestions.remote';
  import AlbumSummaryCard from './AlbumSummaryCard.svelte';

  const suggestions = await getLatestAlbumSuggestions();
</script>

<main class="px-24 pt-12">
  <h1 class="text-4xl font-bold mb-8">Album suggestions</h1>

  {#if !suggestions}
  	<p>no suggestions yet...</p>
  {:else}
  	<div class="max-w-3xl">
  		{#each suggestions.albums as { name, artists, blurb, images }}
  			<AlbumSummaryCard
  				name={name}
  				artists={artists}
  				blurb={blurb}
  				imageUrl={images.medium}
  			/>
  		{/each}
  	</div>
  {/if}
</main>
