<script lang="ts">
  export let name: string;
  export let artists: { name: string }[];
  export let blurb: string;
  export let imageUrl: string;
</script>

<div class="flex gap-4 mb-6 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
  <img
    src={imageUrl}
    alt="{name} album art"
    class="w-32 h-32 rounded object-cover flex-shrink-0"
  />
  <div class="flex flex-col justify-center">
    <h2 class="text-xl font-bold mb-1">
      {name}
    </h2>
    <p class="text-gray-600 text-sm mb-2">
      {artists.map(a => a.name).join(', ')}
    </p>
    <p class="text-gray-800">
      {blurb}
    </p>
  </div>
</div>
