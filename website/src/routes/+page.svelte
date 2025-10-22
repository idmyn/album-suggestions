<script lang="ts">
  import { getLatestAlbumSuggestions } from './albumSuggestions.remote';

  const query = getLatestAlbumSuggestions();
</script>

<h1>Album suggestions</h1>

{#if query.error}
	<p>oops!</p>
{:else if query.loading}
	<p>loading...</p>
{:else}
	<ul>
		{#each query.current?.albums as { name }}
			<li>{name}</li>
		{/each}
	</ul>
{/if}
