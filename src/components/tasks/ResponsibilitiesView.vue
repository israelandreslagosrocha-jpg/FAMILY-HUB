<script setup lang="ts">
import { useTaskStore } from '../../stores/taskStore'
import { useAuthStore } from '../../stores/authStore'
import EducationalHintCard from '../common/EducationalHintCard.vue'

const taskStore = useTaskStore()
const authStore = useAuthStore()

function getMemberObj(memberId: string) {
  return authStore.familyMembers.find((m: any) => m.id === memberId)
}
</script>

<template>
  <div class="responsibilities-container">
    <EducationalHintCard type="responsibilities" />
    <div class="resp-grid">
      <div 
        v-for="resp in taskStore.responsibilities" 
        :key="resp.id"
        class="resp-card glass-card"
        :style="{ '--resp-color': resp.color }"
      >
        <!-- Icono y Título -->
        <div class="resp-card-header">
          <span class="resp-icon">{{ resp.icon }}</span>
          <div class="resp-title-col">
            <h3 class="resp-title">{{ resp.title }}</h3>
            <span class="resp-tag">Área Fija del Hogar</span>
          </div>
        </div>

        <p class="resp-desc">{{ resp.description }}</p>

        <!-- Encargado por Defecto -->
        <div class="resp-assigned-footer">
          <span class="footer-label">Responsable principal:</span>
          <div v-if="getMemberObj(resp.defaultAssignedMemberId)" class="member-pill">
            <span 
              class="m-dot" 
              :style="{ backgroundColor: getMemberObj(resp.defaultAssignedMemberId)?.color }"
            ></span>
            <span class="m-name">{{ getMemberObj(resp.defaultAssignedMemberId)?.name }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.responsibilities-container {
  display: flex;
  flex-direction: column;
}

.resp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.25rem;
}

.resp-card {
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border-top: 4px solid var(--resp-color, #3b82f6);
}

.resp-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.resp-icon {
  font-size: 2rem;
}

.resp-title-col {
  display: flex;
  flex-direction: column;
}

.resp-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.resp-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.resp-desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

.resp-assigned-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 0.6rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.08);
}

.footer-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.member-pill {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.05);
  padding: 0.25rem 0.6rem;
  border-radius: 12px;
}

@media (prefers-color-scheme: dark) {
  .member-pill {
    background: rgba(255, 255, 255, 0.1);
  }
}

.m-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.m-name {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-primary);
}
</style>
