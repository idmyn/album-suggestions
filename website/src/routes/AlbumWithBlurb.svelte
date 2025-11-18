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
	<div class="album-header">
		<h2 class="album-title">{name}</h2>
		<p class="album-artist">{artists.map((a) => a.name).join(", ")}</p>
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
	<div class="album-blurb-container">
		<p class="album-blurb">{blurb}</p>
	</div>
</div>

<style>
	.album-card {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		gap: theme(spacing.3);
		row-gap: theme(spacing.1);
		margin-bottom: theme(spacing.8);
	}

	.album-image-container {
		position: relative;
		grid-row: 1;
		grid-column: 1;
		align-self: center;
	}

	.album-image {
		width: 80px;
		height: 80px;
		object-fit: cover;
	}

	.album-header {
		grid-row: 1;
		grid-column: 2;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-self: center;
	}

	.album-blurb-container {
		grid-row: 2;
		grid-column: 1 / -1;
	}

	.album-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.album-artist {
		font-size: 0.875rem;
		color: rgb(64 64 64);
	}

	.album-blurb {
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.streaming-links {
		display: flex;
		gap: theme(spacing.3);
		margin-top: theme(spacing.1);
		flex-wrap: wrap;
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

	@media (min-width: 768px) {
		.album-card {
			grid-template-columns: auto 1fr;
			grid-template-rows: auto 1fr;
			column-gap: theme(spacing.4);
			margin-bottom: 2.5rem;
		}

		.album-image-container {
			grid-row: 1 / -1;
			grid-column: 1;
			align-self: start;
		}

		.album-image {
			width: 180px;
			height: 180px;
		}

		.album-header {
			grid-row: 1;
			grid-column: 2;
			justify-content: center;
		}

		.album-blurb-container {
			grid-row: 2;
			grid-column: 2;
		}

		.album-title {
			font-size: 1.25rem;
		}

		.album-artist {
			font-size: 1rem;
			color: inherit;
		}

		.album-blurb {
			font-size: 0.95rem;
			max-width: 40rem;
		}

		.streaming-links {
			gap: 0.75rem;
		}
	}
</style>
