<script lang="ts">
  export let name: string;
  export let artists: { name: string }[];
  export let blurb: string;
  export let imageUrl: string;
  export let spotifyUrl: string;
  export let appleMusicUrl: string | null;
  export let tidalUrl: string | null;
</script>

<div class="flex gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <img
    src={imageUrl}
    alt="{name} album art"
    class="w-32 h-32 rounded object-cover flex-shrink-0"
  />
  <div class="flex flex-col justify-center flex-1">
    <h2 class="text-xl font-bold mb-1">
      {name}
    </h2>
    <p class="text-gray-600 text-sm mb-2">
      {artists.map(a => a.name).join(', ')}
    </p>
    <p class="text-gray-800 mb-3">
      {blurb}
    </p>
    <div class="flex gap-3">
      <a href={spotifyUrl} target="_blank" rel="noopener noreferrer" class="text-sm text-green-600 hover:text-green-700 font-medium">
        Spotify
      </a>
      {#if appleMusicUrl}
        <a href={appleMusicUrl} target="_blank" rel="noopener noreferrer" class="text-sm text-pink-600 hover:text-pink-700 font-medium">
          Apple Music
        </a>
      {/if}
      {#if tidalUrl}
        <a href={tidalUrl} target="_blank" rel="noopener noreferrer" class="text-sm hover:text-blue-700 font-medium">
          Tidal
        </a>
      {/if}
    </div>
  </div>
</div>
