<script setup>
import { computed } from 'vue'

const props = defineProps({
  level: { type: Object, required: true },
  position: { type: Object, required: true },
  hovered: Boolean,
  selected: Boolean,
})

const emit = defineEmits(['hover', 'leave', 'select'])
const hitStyle = computed(() => ({
  left: `${props.position.x / props.position.baseWidth * 100}%`,
  top: `${props.position.y / props.position.baseHeight * 100}%`,
  width: `${props.position.width / props.position.baseWidth * 100}%`,
  height: `${props.position.height / props.position.baseHeight * 100}%`,
}))
</script>

<template>
  <button
    class="level-hit-area"
    :class="{ 'is-hovered': hovered, 'is-selected': selected }"
    :style="hitStyle"
    type="button"
    :aria-label="`${level.title}，${level.subtitle}`"
    :aria-pressed="selected"
    @mouseenter="emit('hover', level.id)"
    @mouseleave="emit('leave')"
    @focus="emit('hover', level.id)"
    @blur="emit('leave')"
    @click="emit('select', level)"
  />
</template>

<style scoped>
.level-hit-area {
  position: absolute;
  z-index: 2;
  display: block;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  outline: none;
}

.level-hit-area:focus-visible {
  outline: 2px solid rgba(255, 224, 140, .78);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .level-hit-area { transition: none; }
}
</style>
