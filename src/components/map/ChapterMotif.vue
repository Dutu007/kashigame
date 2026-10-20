<script setup>
defineProps({ chapterId: Number })
</script>

<template>
  <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <g v-if="chapterId === 1"><path d="M15 12h34v40H15zM21 12v40M43 12v40M15 20h34M15 44h34M24 32l8-8 8 8-8 8z" /><path d="M27 32h10M32 27v10" /></g>
    <g v-else-if="chapterId === 2"><path d="M32 10c-5 9-14 18-14 27a14 14 0 0 0 28 0c0-9-9-18-14-27Z" /><path d="M24 36c0 6 3 9 8 10M10 54q6-4 12 0t12 0 12 0 10 0" /></g>
    <g v-else-if="chapterId === 3"><path d="M12 28h40l-5-14H17zM15 29v23h34V29M24 52V37h16v15M23 14l-2 14M41 14l2 14M32 14v14" /><path d="M12 28q5 8 10 0 5 8 10 0 5 8 10 0 5 8 10 0" /></g>
    <g v-else-if="chapterId === 4"><path d="M25 12h14v6l-3 5c0 5 12 9 12 19 0 8-6 12-16 12S16 50 16 42c0-10 12-14 12-19l-3-5zM25 18h14M20 33q12 5 24 0M18 45q14 6 28 0" /><path d="m26 39 6-4 6 4-6 4z" /></g>
    <g v-else><path d="m39 10 6 3-13 28M36 17l6 3M24 32c-8 0-14 8-12 15s10 10 17 6 8-12 3-17zM20 47l18-29" /><circle cx="25" cy="42" r="3" /><path d="M47 33v16m0-16 8-2v15" /><ellipse cx="44" cy="50" rx="3" ry="2" /><ellipse cx="52" cy="47" rx="3" ry="2" /></g>
  </svg>
</template>
