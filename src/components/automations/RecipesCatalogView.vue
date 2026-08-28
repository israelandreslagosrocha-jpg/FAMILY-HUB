<script setup lang="ts">
import { useAutomationStore } from '../../stores/automationStore'

const automationStore = useAutomationStore()

function handleActivate(recipeId: string) {
  automationStore.activateRecipe(recipeId)
}
</script>

<template>
  <div class="recipes-catalog-container">
    <div class="section-intro-card glass-card">
      <span class="intro-icon">💡</span>
      <div class="intro-text">
        <h3 class="intro-title">Recetas Prediseñadas del Hogar</h3>
        <p class="intro-desc">Activa en 1 toque automatizaciones diseñadas para la rutina diaria de la familia.</p>
      </div>
    </div>

    <div class="recipes-grid">
      <div 
        v-for="recipe in automationStore.recipes" 
        :key="recipe.id"
        class="recipe-card glass-card"
      >
        <div class="recipe-card-header">
          <span class="recipe-icon">{{ recipe.icon }}</span>
          <div class="recipe-title-col">
            <h3 class="recipe-title">{{ recipe.title }}</h3>
            <span class="category-badge">{{ recipe.category }}</span>
          </div>
        </div>

        <p class="recipe-desc">{{ recipe.description }}</p>

        <!-- Bloque Visual Cuando -> Si -> Entonces -->
        <div class="logic-flow-preview">
          <div class="logic-step step-when">
            <span class="step-label">⚡ CUANDO:</span>
            <span class="step-value">{{ recipe.triggerText }}</span>
          </div>
          <div v-if="recipe.conditionText" class="logic-step step-if">
            <span class="step-label">🔍 SI:</span>
            <span class="step-value">{{ recipe.conditionText }}</span>
          </div>
          <div class="logic-step step-then">
            <span class="step-label">🚀 ENTONCES:</span>
            <span class="step-value">{{ recipe.actionText }}</span>
          </div>
        </div>

        <!-- Botón de Activación en 1 toque -->
        <div class="recipe-footer">
          <button class="activate-btn" @click="handleActivate(recipe.id)">
            + Activar Receta
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.recipes-catalog-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.section-intro-card {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.9rem 1.15rem;
  border-radius: 16px;
  box-sizing: border-box;
}

.intro-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.intro-title {
  font-size: 0.95rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.intro-desc {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0;
  line-height: 1.35;
}

.recipes-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .recipes-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

.recipe-card {
  padding: 1.15rem 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  box-sizing: border-box;
  width: 100%;
}

.recipe-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.recipe-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.recipe-title-col {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.recipe-title {
  font-size: 1.05rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.category-badge {
  font-size: 0.72rem;
  font-weight: 700;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  width: fit-content;
  margin-top: 0.2rem;
}

.recipe-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

.logic-flow-preview {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  background: rgba(0, 0, 0, 0.03);
  padding: 0.75rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
}

:root[data-theme="dark"] .logic-flow-preview {
  background: rgba(255, 255, 255, 0.05);
}

.logic-step {
  display: flex;
  gap: 0.4rem;
  font-size: 0.8rem;
  line-height: 1.35;
}

.step-label {
  font-weight: 800;
  white-space: nowrap;
}

.step-when .step-label { color: #d97706; }
.step-if .step-label { color: #2563eb; }
.step-then .step-label { color: #059669; }

.step-value {
  color: var(--text-primary);
}

.recipe-footer {
  margin-top: 0.2rem;
}

.activate-btn {
  width: 100%;
  padding: 0.75rem;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.3);
  transition: transform 0.15s, background 0.15s;
}

.activate-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}
</style>
