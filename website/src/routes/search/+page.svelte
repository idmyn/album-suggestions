<script lang="ts">
	import AlbumWithBlurb from "../AlbumWithBlurb.svelte";
	import Header from "../Header.svelte";

	type SearchResult = {
		id: string;
		name: string;
		blurb: string;
		spotifyUrl: string;
		appleMusicUrl: string | null;
		tidalUrl: string | null;
		mediumImageUrl: string;
		artists: { name: string }[];
		distance: number;
	};

	let query = $state("");
	let results = $state<SearchResult[]>([]);
	let isLoading = $state(false);
	let searchedQuery = $state("");
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	async function search(q: string) {
		if (!q.trim()) {
			results = [];
			searchedQuery = "";
			return;
		}

		isLoading = true;
		try {
			const response = await fetch(
				`/api/search?q=${encodeURIComponent(q.trim())}`,
			);
			const data = await response.json();
			results = data.albums;
			searchedQuery = data.query;
		} catch (error) {
			console.error("Search failed:", error);
			results = [];
		} finally {
			isLoading = false;
		}
	}

	function handleInput() {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}
		debounceTimer = setTimeout(() => {
			search(query);
		}, 500);
	}
</script>

<div class="container">
	<Header>
		<div class="title">search</div>
		<a href="/" class="back-link">← back</a>
	</Header>

	<div class="search-box">
		<input
			type="text"
			bind:value={query}
			oninput={handleInput}
			placeholder="Search by mood, genre, or description..."
			class="search-input"
		/>
	</div>

	<main>
		{#if isLoading}
			<p class="status">searching...</p>
		{:else if searchedQuery && results.length === 0}
			<p class="status">no results for "{searchedQuery}"</p>
		{:else if results.length > 0}
			{#each results as album (album.id)}
				<AlbumWithBlurb
					name={album.name}
					artists={album.artists}
					blurb={album.blurb}
					imageUrl={album.mediumImageUrl}
					spotifyUrl={album.spotifyUrl}
					appleMusicUrl={album.appleMusicUrl}
					tidalUrl={album.tidalUrl}
				/>
			{/each}
		{:else}
			<p class="status">enter a query to search albums by their blurb</p>
		{/if}
	</main>
</div>

<style>
	.container {
		padding: theme(spacing.4);
		min-height: 100vh;
		max-width: 50rem;
		margin: auto;
	}

	.title {
		font-size: 1.25rem;
		font-weight: 500;
	}

	.back-link {
		text-decoration: underline;
	}

	.search-box {
		margin-bottom: theme(spacing.6);
	}

	.search-input {
		width: 100%;
		padding: theme(spacing.3);
		font-size: 1rem;
		border: 1px solid black;
		border-radius: 4px;
	}

	.search-input:focus {
		outline: none;
		border-color: rgb(100 100 100);
	}

	.status {
		color: rgb(100 100 100);
		font-size: 0.95rem;
	}

	main {
		max-width: 100%;
	}
</style>
