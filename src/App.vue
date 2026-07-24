<template>
  <div class="app-container">
    <VideoExtractor />
  </div>
</template>

<script setup>
import VideoExtractor from './components/VideoExtractor.vue'
</script>

<style scoped>
.app-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}
</style>
