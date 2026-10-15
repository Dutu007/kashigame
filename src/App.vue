<script setup>
import { onMounted, ref } from 'vue'
import HomePage from './components/HomePage.vue'
import CharacterSelect from './components/CharacterSelect.vue'
import GameLoading from './components/GameLoading.vue'
import MapPage from './components/MapPage.vue'
import femaleCharacterUrl from './assets/processed/female-character-transparent.png'
import journeyButtonUrl from './assets/processed/start-journey-button-transparent.png'

const view = ref('home')

function preload(url) {
  const image = new Image()
  image.src = url
}

onMounted(() => {
  preload('/首页加载.png')
  preload('/加载动画所用材质.png')
  preload('/地图.png')
  preload('/角色选择背景图.png')
  preload('/男性角色.png')
  preload(femaleCharacterUrl)
  preload(journeyButtonUrl)
})

function openCharacterSelect() { view.value = 'character' }
function openLoading() { view.value = 'loading' }
function returnHome() { view.value = 'home' }
</script>

<template>
  <HomePage v-if="view === 'home'" @start="openCharacterSelect" />
  <CharacterSelect v-else-if="view === 'character'" @start="openLoading" @back="returnHome" />
  <GameLoading v-else-if="view === 'loading'" @complete="view = 'map'" />
  <MapPage v-else />
</template>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
}
</style>
