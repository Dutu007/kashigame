<script setup>
defineProps({ variant: { type: String, default: 'teal' } })
</script>

<template>
  <svg class="kashgar-plaque" :class="variant" viewBox="0 0 160 72" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <path class="plaque-edge" d="M80 3 91 9H137Q141 18 151 22L157 36 151 50Q141 54 137 63H91L80 69 69 63H23Q19 54 9 50L3 36 9 22Q19 18 23 9H69Z" />
    <path class="plaque-face" d="m80 8 10 6h44q4 8 13 12l5 10-5 10q-9 4-13 12H90l-10 6-10-6H26q-4-8-13-12L8 36l5-10q9-4 13-12h44Z" />
    <path class="plaque-stitch" d="M31 19h36m26 0h36M31 53h36m26 0h36" stroke-dasharray="2 3" />
    <g class="plaque-pattern" stroke-width="1.1">
      <path d="m80 10 3 5 6 2-6 2-3 5-3-5-6-2 6-2Z" />
      <path d="m80 48 3 5 6 2-6 2-3 5-3-5-6-2 6-2Z" />
      <path d="m16 30 6 6-6 6-6-6Zm128 0 6 6-6 6-6-6Z" />
      <path d="m26 22 4 4-4 4-4-4Zm108 0 4 4-4 4-4-4ZM26 42l4 4-4 4-4-4Zm108 0 4 4-4 4-4-4Z" />
    </g>
    <path class="plaque-highlight" d="M32 16h32m32 0h32" />
  </svg>
</template>

<style scoped>
.kashgar-plaque { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
.plaque-edge { fill: #c99a63; stroke: #f8e3b5; stroke-width: 1.5; }
.plaque-face { fill: #6f928b; stroke: #f1d49a; stroke-width: 1; }
.plaque-pattern { fill: #d39d7c; stroke: #f8dfaa; }
.plaque-stitch { stroke: #e9c995; opacity: .58; }
.plaque-highlight { stroke: #fff5d3; opacity: .7; }
.sand .plaque-face { fill: #f3e4c4; stroke: #d3b07b; }
.sand .plaque-edge { fill: #c79b69; }
.sand .plaque-pattern { fill: #8eaaa0; stroke: #d2ae74; }
.sand .plaque-stitch { stroke: #b88b61; opacity: .55; }
</style>
