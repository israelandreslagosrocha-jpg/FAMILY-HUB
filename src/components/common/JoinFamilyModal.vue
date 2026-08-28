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
      <!-- Tirador táctil en móvil -->
      <div class="sheet-grabber mobile-grabber"></div>

      <div class="modal-header">
        <div class="header-icon">🏠</div>
        <div class="header-texts">
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
            {{ isLoadingMembers ? 'Buscando...' : '🔍 Buscar' }}
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
  inset: 0;
  background: rgba(9, 13, 22, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
}

/* Base Móvil (<768px): Bottom Sheet Táctil */
.join-modal-card {
  width: 100%;
  max-width: 100%;
  max-height: calc(100dvh - 1.5rem);
  background: var(--bg-card, #0f172a);
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.1));
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
  padding: 1.25rem;
  padding-bottom: max(1.5rem, var(--sab));
  box-shadow: var(--shadow-card, 0 20px 50px rgba(0, 0, 0, 0.3));
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-sizing: border-box;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.mobile-grabber {
  display: block;
}

.modal-header {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.header-icon {
  font-size: 2rem;
  background: rgba(59, 130, 246, 0.1);
  padding: 0.45rem 0.65rem;
  border-radius: 14px;
  flex-shrink: 0;
}

.header-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.badge-pill {
  font-size: 0.68rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.05em;
}

.modal-title {
  font-size: 1.35rem;
  font-weight: 900;
  margin: 0.1rem 0;
  color: var(--text-primary);
  line-height: 1.2;
}

.modal-sub {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.35;
}

.error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #ef4444;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  font-size: 0.82rem;
  font-weight: 600;
}

.step-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.margin-top {
  margin-top: 0.35rem;
}

.section-label {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-primary);
}

.section-hint {
  font-size: 0.78rem;
  color: var(--text-secondary);
  margin: 0;
}

.code-input-row {
  display: flex;
  gap: 0.5rem;
}

.code-input {
  flex: 1;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.15));
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.4;
  min-height: var(--touch-target-min);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  box-sizing: border-box;
}

.search-btn {
  padding: 0.75rem 1rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: none;
  background: #3b82f6;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  white-space: nowrap;
  flex-shrink: 0;
}

.members-select-grid {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-top: 0.35rem;
}

.member-option-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;
  box-sizing: border-box;
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
  flex-shrink: 0;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.member-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-primary);
}

.member-role {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.claimed-tag {
  font-size: 0.72rem;
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
  margin-top: 0.75rem;
}

.link-confirm-btn {
  width: 100%;
  padding: 0.85rem;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  transition: transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
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
  min-height: var(--touch-target-min);
  cursor: pointer;
  touch-action: manipulation;
  text-decoration: underline;
  padding: 0.4rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* ============================================================================
   🖥️ DESKTOP / TABLET (>= 768px): Modal Centrado Clásico
   ============================================================================ */
@media (min-width: 768px) {
  .modal-backdrop {
    align-items: center;
    padding: 1.5rem;
  }

  .join-modal-card {
    max-width: 520px;
    border-radius: 24px;
    border-bottom: 1px solid var(--border-subtle);
    padding: 1.75rem;
    animation: none;
  }

  .mobile-grabber {
    display: none;
  }

  .modal-title {
    font-size: 1.5rem;
  }
}
</style>
