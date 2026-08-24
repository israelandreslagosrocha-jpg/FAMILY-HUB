<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../../stores/authStore'

const authStore = useAuthStore()

const inviteCodeInput = ref('LAGOS-FAMILY')
const isLoadingMembers = ref(false)
const availableMembers = ref<any[]>([])
const selectedMemberId = ref<string | null>(null)
const errorMsg = ref<string | null>(null)
const isSubmitting = ref(false)

onMounted(async () => {
  await handleSearchFamily()
})

async function handleSearchFamily() {
  if (!inviteCodeInput.value.trim()) return
  isLoadingMembers.value = true
  errorMsg.value = null
  availableMembers.value = []
  selectedMemberId.value = null

  try {
    const members = await authStore.fetchMembersByInviteCode(inviteCodeInput.value.trim())
    availableMembers.value = members

    // Auto-seleccionar si hay coincidencia de nombre con natalia/mamá
    const match = members.find((m: any) => 
      m.name.toLowerCase().includes('natalia') || 
      m.name.toLowerCase().includes('naty') ||
      m.role.toLowerCase().includes('mamá')
    )
    if (match) {
      selectedMemberId.value = match.id
    } else if (members.length > 0) {
      selectedMemberId.value = members[0].id
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Código de invitación no encontrado.'
  } finally {
    isLoadingMembers.value = false
  }
}

async function handleLinkProfile() {
  if (!selectedMemberId.value) return
  isSubmitting.value = true
  errorMsg.value = null

  try {
    const success = await authStore.linkMemberProfile(inviteCodeInput.value.trim(), selectedMemberId.value)
    if (!success && authStore.authError) {
      errorMsg.value = authStore.authError
    }
  } catch (err: any) {
    errorMsg.value = err.message || 'Error al vincular el perfil.'
  } finally {
    isSubmitting.value = false
  }
}

function handleLogout() {
  authStore.logout()
}
</script>

<template>
  <div class="modal-backdrop">
    <div class="join-modal-card glass-card">
      <div class="modal-header">
        <div class="header-icon">🏠</div>
        <div>
          <span class="badge-pill">VINCULACIÓN DE CUENTA</span>
          <h2 class="modal-title">Unirse a la Familia</h2>
          <p class="modal-sub">
            Ingresaste como <strong>{{ authStore.user?.email }}</strong>. Vincula tu cuenta al hogar existente.
          </p>
        </div>
      </div>

      <div v-if="errorMsg" class="error-banner">
        ⚠️ {{ errorMsg }}
      </div>

      <div class="step-section">
        <label class="section-label">1. Código de Invitación del Hogar</label>
        <div class="code-input-row">
          <input 
            v-model="inviteCodeInput" 
            type="text" 
            class="code-input"
            placeholder="Ej. LAGOS-FAMILY"
            @keyup.enter="handleSearchFamily"
          />
          <button class="search-btn" @click="handleSearchFamily" :disabled="isLoadingMembers">
            {{ isLoadingMembers ? 'Buscando...' : '🔍 Buscar Hogar' }}
          </button>
        </div>
      </div>

      <!-- Paso 2: Selección de Integrante del Hogar -->
      <div v-if="availableMembers.length > 0" class="step-section margin-top">
        <label class="section-label">2. ¿Quién eres en la familia?</label>
        <p class="section-hint">Selecciona tu perfil entre los integrantes de la familia:</p>

        <div class="members-select-grid">
          <div 
            v-for="m in availableMembers" 
            :key="m.id"
            class="member-option-card"
            :class="{ selected: selectedMemberId === m.id, claimed: m.is_claimed }"
            @click="!m.is_claimed && (selectedMemberId = m.id)"
          >
            <div class="member-badge-dot" :style="{ backgroundColor: m.color }"></div>
            <div class="member-info">
              <span class="member-name">{{ m.name }}</span>
              <span class="member-role">{{ m.role }}</span>
            </div>
            <span v-if="m.is_claimed" class="claimed-tag">Vinculado</span>
            <span v-else-if="selectedMemberId === m.id" class="check-icon">✓</span>
          </div>
        </div>

        <div class="action-footer">
          <button 
            class="link-confirm-btn" 
            :disabled="!selectedMemberId || isSubmitting"
            @click="handleLinkProfile"
          >
            {{ isSubmitting ? 'Vincular cuenta...' : '✨ Unirse a la Familia' }}
          </button>

          <button class="logout-link-btn" @click="handleLogout">
            Cerrar sesión / Cambiar de cuenta
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.join-modal-card {
  width: 100%;
  max-width: 520px;
  background: var(--bg-card, #0f172a);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-radius: 24px;
  padding: 1.75rem;
  box-shadow: var(--shadow-card, 0 20px 50px rgba(0, 0, 0, 0.3));
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.modal-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.header-icon {
  font-size: 2.2rem;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.5rem 0.75rem;
  border-radius: 16px;
}

.badge-pill {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.05em;
}

.modal-title {
  font-size: 1.5rem;
  font-weight: 900;
  margin: 0.2rem 0;
  color: var(--text-primary);
}

.modal-sub {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
}

.step-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.margin-top {
  margin-top: 0.5rem;
}

.section-label {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-primary);
}

.section-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
}

.code-input-row {
  display: flex;
  gap: 0.5rem;
}

.code-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.search-btn {
  padding: 0.75rem 1.25rem;
  border-radius: 12px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.members-select-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.member-option-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition: all 0.2s ease;
}

.member-option-card:hover:not(.claimed) {
  background: rgba(255, 255, 255, 0.08);
}

.member-option-card.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.member-option-card.claimed {
  opacity: 0.5;
  cursor: not-allowed;
}

.member-badge-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.member-role {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.claimed-tag {
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 8px;
  border-radius: 8px;
}

.check-icon {
  color: #3b82f6;
  font-weight: 800;
  font-size: 1.1rem;
}

.action-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
}

.link-confirm-btn {
  width: 100%;
  padding: 0.9rem;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.15s;
}

.link-confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.link-confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logout-link-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 0.82rem;
  cursor: pointer;
  text-decoration: underline;
  padding: 0.4rem;
}
</style>
