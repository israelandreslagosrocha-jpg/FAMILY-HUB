<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  avatarId: string
  size?: number
  borderColor?: string
}>()

const avatarSize = computed(() => props.size || 40)

// Importación directa dinámica de los SVG locales por su avatarId
const avatarUrl = computed(() => {
  const id = props.avatarId || 'avatar-01'
  return new URL(`../../assets/avatars/${id}.svg`, import.meta.url).href
})
</script>

<template>
  <div 
    class="avatar-wrapper"
    :style="{
      width: `${avatarSize}px`,
      height: `${avatarSize}px`,
      borderColor: borderColor || 'transparent'
    }"
  >
    <img :src="avatarUrl" :alt="avatarId" class="avatar-img" />
  </div>
</template>

<style scoped>
.avatar-wrapper {
  border-radius: 50%;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid transparent;
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.05);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
