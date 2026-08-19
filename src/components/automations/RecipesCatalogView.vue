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
  gap: 1.25rem;
}

.section-intro-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 16px;
}

.intro-icon {
  font-size: 1.8rem;
}

.intro-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.intro-desc {
  font-size: 0.83rem;
  color: var(--text-secondary);
  margin: 0.15rem 0 0;
}

.recipes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.25rem;
}

.recipe-card {
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.recipe-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.recipe-icon {
  font-size: 2rem;
}

.recipe-title-col {
  display: flex;
  flex-direction: column;
}

.recipe-title {
  font-size: 1.05rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}

.category-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.12);
  padding: 0.1rem 0.45rem;
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
}

@media (prefers-color-scheme: dark) {
  .logic-flow-preview {
    background: rgba(255, 255, 255, 0.05);
  }
}

.logic-step {
  display: flex;
  gap: 0.4rem;
  font-size: 0.8rem;
  line-height: 1.3;
}

.step-label {
  font-weight: 700;
  white-space: nowrap;
}

.step-when .step-label { color: #f59e0b; }
.step-if .step-label { color: #3b82f6; }
.step-then .step-label { color: #10b981; }

.step-value {
  color: var(--text-primary);
}

.recipe-footer {
  margin-top: 0.2rem;
}

.activate-btn {
  width: 100%;
  padding: 0.65rem;
  border-radius: 12px;
  border: none;
  background: #3b82f6;
  color: #ffffff;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;
}

.activate-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}
</style>
