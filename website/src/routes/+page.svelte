<script lang="ts">
  import { getLatestAlbumSuggestions } from './albumSuggestions.remote';

  const query = getLatestAlbumSuggestions();
</script>

<h1 class="text-4xl font-bold mb-8">Album suggestions</h1>

{#if query.error}
	<p>oops!</p>
{:else if query.loading}
	<p>loading...</p>
{:else}
	<ul>
		{#each query.current?.albums as { name, artists, blurb, images }}
		    <img src={images.medium} aria-hidden />
			<li class="mt-2 mb-12"><strong>{name} by {artists.map(a => a.name).join(', ')}</strong><br/>{blurb}</li>
		{/each}
	</ul>
{/if}
