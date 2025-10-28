<script lang="ts">
	export let name: string;
	export let artists: { name: string }[];
	export let blurb: string;
	export let imageUrl: string;
</script>

<div class="album-card">
	<div class="album-image-container">
		<img src={imageUrl} alt="{name} album art" class="album-image" />
	</div>
	<div class="album-info">
		<h2 class="album-title">{name}</h2>
		<p class="album-artist">{artists.map((a) => a.name).join(", ")}</p>
		<p class="album-blurb">{blurb}</p>
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
</style>
