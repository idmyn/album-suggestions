<script lang="ts">
	export let name: string;
	export let artists: { name: string }[];
	export let blurb: string;
	export let imageUrl: string;
	export let spotifyUrl: string;
	export let appleMusicUrl: string | null;
	export let tidalUrl: string | null;
</script>

<div class="card card-m shadow-sm border-black border-1 w-2xl">
	<div class="card-body flex-row gap-4">
		<img
			src={imageUrl}
			alt="{name} album art"
			class="w-44 h-44 rounded-lg object-cover flex-shrink-0"
		/>
		<div class="flex flex-col gap-2">
			<div>
				<h2 class="text-xl font-bold">
					{name}
				</h2>
				<p class="text-sm">
					{artists.map((a) => a.name).join(", ")}
				</p>
			</div>
			<p class="text-gray-800 h-fit grow-0">
				{blurb}
			</p>
			<div class="flex gap-3">
				<a
					href={spotifyUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-sm text-green-600 hover:text-green-700 font-medium"
				>
					Spotify
				</a>
				{#if appleMusicUrl}
					<a
						href={appleMusicUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm text-pink-600 hover:text-pink-700 font-medium"
					>
						Apple Music
					</a>
				{/if}
				{#if tidalUrl}
					<a
						href={tidalUrl}
						target="_blank"
						rel="noopener noreferrer"
						class="text-sm hover:text-blue-700 font-medium"
					>
						Tidal
					</a>
				{/if}
			</div>
		</div>
	</div>
</div>
