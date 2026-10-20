<script setup>
import { onMounted, ref } from 'vue'
import HomePage from './components/HomePage.vue'
import CharacterSelect from './components/CharacterSelect.vue'
import GameLoading from './components/GameLoading.vue'
import MapPage from './components/MapPage.vue'
import { mapArt } from './data/mapVisuals'
import maleCharacterUrl from './assets/processed/male-character-transparent-v2.png'
import femaleCharacterUrl from './assets/processed/female-character-transparent-v2.png'
import journeyButtonUrl from './assets/processed/start-journey-button-transparent.png'
import loadingBackgroundUrl from '../首页加载.png'
import loadingTextureUrl from '../加载动画所用材质.png'
import characterBackgroundUrl from '../角色选择背景图.png'

const view = ref('home')

function preload(url) {
  const image = new Image()
  image.src = url
}

onMounted(() => {
  preload(loadingBackgroundUrl)
  preload(loadingTextureUrl)
  preload(mapArt.cityUrl)
  preload(characterBackgroundUrl)
  preload(maleCharacterUrl)
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
