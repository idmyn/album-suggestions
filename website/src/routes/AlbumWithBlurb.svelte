<script lang="ts">
	export let name: string;
	export let artists: { name: string }[];
	export let blurb: string;
	export let imageUrl: string;
	export let spotifyUrl: string;
	export let appleMusicUrl: string | null;
	export let tidalUrl: string | null;
</script>

<div class="album-card">
	<div class="album-image-container">
		<img src={imageUrl} alt="{name} album art" class="album-image" />
	</div>
	<div class="album-info">
		<h2 class="album-title">{name}</h2>
		<p class="album-artist">{artists.map((a) => a.name).join(", ")}</p>
		<p class="album-blurb">{blurb}</p>
		<div class="streaming-links">
			<a
				href={spotifyUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="streaming-link spotify"
			>
				Spotify
			</a>
			{#if tidalUrl}
				<a
					href={tidalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="streaming-link tidal"
				>
					Tidal
				</a>
			{/if}
			{#if appleMusicUrl}
				<a
					href={appleMusicUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="streaming-link apple-music"
				>
					Apple Music
				</a>
			{/if}
		</div>
	</div>
</div>

<style>
	.album-card {
		display: flex;
		gap: 1rem;
		margin-bottom: 2.5rem;
	}

	.album-image-container {
		position: relative;
		flex-shrink: 0;
	}

	.album-image {
		width: 180px;
		height: 180px;
		object-fit: cover;
	}

	.album-info {
		display: flex;
		flex-direction: column;
	}

	.album-title {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.album-artist {
		font-size: 1rem;
		margin: 0;
	}

	.album-blurb {
		font-size: 0.95rem;
		line-height: 1.5;
		margin-top: theme(spacing.2);
		max-width: 40rem;
	}

	.streaming-links {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.streaming-link {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.streaming-link.spotify {
		color: rgb(22 163 74);
	}

	.streaming-link.spotify:hover {
		color: rgb(21 128 61);
	}

	.streaming-link.apple-music {
		color: rgb(219 39 119);
	}

	.streaming-link.apple-music:hover {
		color: rgb(190 24 93);
	}

	.streaming-link.tidal:hover {
		color: rgb(29 78 216);
	}
</style>
