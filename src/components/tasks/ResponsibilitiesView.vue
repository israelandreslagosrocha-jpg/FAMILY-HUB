<script setup lang="ts">
import { useTaskStore } from '../../stores/taskStore'
import { useAuthStore } from '../../stores/authStore'
import EducationalHintCard from '../common/EducationalHintCard.vue'
import type { ResponsibilityItem } from '../../types'

const taskStore = useTaskStore()
const authStore = useAuthStore()

function getMemberObj(memberId: string) {
  return authStore.familyMembers.find((m: any) => m.id === memberId)
}

function handleEdit(resp: ResponsibilityItem) {
  taskStore.openEditResponsibilitySheet(resp)
}

function handleDelete(respId: string) {
  if (confirm('¿Deseas eliminar esta responsabilidad del hogar?')) {
    taskStore.deleteResponsibilityWithSupabase(respId)
  }
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
            <div class="resp-title-row">
              <h3 class="resp-title">{{ resp.title }}</h3>
              <span v-if="resp.fixedTime" class="fixed-time-chip">⏰ {{ resp.fixedTime }}</span>
            </div>
            <span class="resp-tag">Área Fija del Hogar</span>
          </div>

          <div class="resp-actions">
            <button type="button" class="action-btn-sm" title="Editar Responsabilidad" @click="handleEdit(resp)">✏️</button>
            <button type="button" class="action-btn-sm" title="Eliminar Responsabilidad" @click="handleDelete(resp.id)">🗑️</button>
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
  flex: 1;
  display: flex;
  flex-direction: column;
}

.resp-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.resp-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.fixed-time-chip {
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 8px;
}

.resp-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.action-btn-sm {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 3px 5px;
  border-radius: 6px;
  transition: background 0.15s;
}

.action-btn-sm:hover {
  background: rgba(0, 0, 0, 0.08);
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
