<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../services/supabaseClient'
import AvatarImage from '../components/common/AvatarImage.vue'

const authStore = useAuthStore()

const isModalOpen = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const editingMemberId = ref<string | null>(null)
const isSubmitting = ref(false)
const copied = ref(false)

// Form fields
const name = ref('')
const role = ref('Mamá')
const selectedAvatar = ref('avatar-02')
const selectedColor = ref('#ec4899')

function copyInviteCode() {
  navigator.clipboard.writeText(authStore.familyInviteCode || 'LAGOS-FAMILY')
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

const avatarOptions = [
  'avatar-01', 'avatar-02', 'avatar-03', 'avatar-04',
  'avatar-05', 'avatar-06', 'avatar-07', 'avatar-08'
]

const colorOptions = [
  { name: 'Azul (Israel)', hex: '#3b82f6' },
  { name: 'Morado (Natalia)', hex: '#a855f7' },
  { name: 'Verde (Santi)', hex: '#10b981' },
  { name: 'Rosado (Vicente)', hex: '#ec4899' },
  { name: 'Naranja', hex: '#f59e0b' },
  { name: 'Rojo', hex: '#ef4444' }
]

onMounted(async () => {
  await authStore.loadFamilyMembers()
})

function openModal() {
  modalMode.value = 'add'
  editingMemberId.value = null
  name.value = ''
  role.value = 'Mamá'
  selectedAvatar.value = 'avatar-02'
  selectedColor.value = '#ec4899'
  isModalOpen.value = true
}

function openEditModal(m: any) {
  modalMode.value = 'edit'
  editingMemberId.value = m.id
  name.value = m.name
  role.value = m.role
  selectedAvatar.value = m.avatarId
  selectedColor.value = m.color
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  editingMemberId.value = null
}

async function handleSaveMember() {
  if (!name.value) return
  isSubmitting.value = true

  try {
    if (modalMode.value === 'edit' && editingMemberId.value) {
      await authStore.updateFamilyMember(editingMemberId.value, {
        name: name.value,
        role: role.value,
        avatarId: selectedAvatar.value,
        color: selectedColor.value
      })
      closeModal()
    } else {
      const { data: userFam } = await supabase.from('family_members').select('family_id').limit(1).single()
      const familyId = userFam?.family_id

      const { error } = await supabase.from('family_members').insert({
        family_id: familyId,
        name: name.value,
        role: role.value,
        avatar_id: selectedAvatar.value,
        color: selectedColor.value,
        is_active: true
      })

      if (error) {
        alert('Error al agregar miembro: ' + error.message)
      } else {
        await authStore.loadFamilyMembers()
        closeModal()
      }
    }
  } catch (err: any) {
    alert('Error al procesar: ' + err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDeleteMember(memberId: string, memberName: string) {
  if (confirm(`¿Deseas eliminar a "${memberName}" de la familia?`)) {
    await authStore.deleteFamilyMember(memberId)
  }
}
</script>

<template>
  <div class="family-page">
    <div class="header-section">
      <div>
        <h1 class="page-title">👨‍👩‍👧‍👦 Gestión de la Familia</h1>
        <p class="page-subtitle">Perfiles de cada integrante de tu hogar, avatares y colores identificadores.</p>
      </div>

      <button class="add-member-btn" @click="openModal">
        ➕ Agregar Miembro
      </button>
    </div>

    <!-- Tarjeta de Código de Invitación del Hogar -->
    <div class="invite-code-card glass-card">
      <div class="invite-info">
        <span class="invite-tag">🔑 CÓDIGO DE INVITACIÓN DEL HOGAR</span>
        <h3 class="invite-code-text">{{ authStore.familyInviteCode }}</h3>
        <p class="invite-sub">Comparte este código con tu esposa o hijos para que unan su cuenta en 1 clic.</p>
      </div>
      <button class="copy-code-btn" @click="copyInviteCode">
        📋 {{ copied ? '¡Copiado!' : 'Copiar Código' }}
      </button>
    </div>

    <!-- Lista de Miembros -->
    <div v-if="authStore.familyMembers.length > 0" class="members-grid">
      <div 
        v-for="m in authStore.familyMembers" 
        :key="m.id" 
        class="member-card bento-card"
        :style="{ borderTop: `4px solid ${m.color}` }"
      >
        <div class="avatar-wrapper">
          <AvatarImage :avatarId="m.avatarId" :size="72" :borderColor="m.color" />
        </div>

        <div class="member-info">
          <h3 class="member-name">{{ m.name }}</h3>
          <span class="member-role" :style="{ color: m.color }">{{ m.role }}</span>
        </div>

        <div class="card-actions">
          <button 
            class="edit-btn"
            @click="openEditModal(m)"
            title="Editar Color y Avatar"
          >
            ✏️ Editar Perfil
          </button>
          <button 
            v-if="m.role !== 'Papá' && m.role !== 'Jefe de Hogar'"
            class="delete-btn" 
            @click="handleDeleteMember(m.id, m.name)" 
            title="Eliminar Miembro"
          >
            🗑️ Eliminar
          </button>
        </div>
      </div>
    </div>

    <!-- Estado Vacío Limpio -->
    <div v-else class="empty-state glass-card">
      <div class="empty-icon">👨‍👩‍👧‍👦</div>
      <h3 class="empty-title">Aún no has agregado integrantes a tu familia</h3>
      <p class="empty-desc">Presiona el botón "+ Agregar Miembro" para registrar a tu esposa, hijos o familiares.</p>
      <button class="add-member-btn" @click="openModal">
        ➕ Agregar el Primer Miembro
      </button>
    </div>

    <!-- Modal Formulario Agregar / Editar Miembro (Mobile Bottom Sheet) -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card glass-card" @click.stop>
        <div class="sheet-grabber"></div>
        <div class="modal-header">
          <h3 class="modal-title">{{ modalMode === 'edit' ? '✏️ Editar Integrante' : '✨ Agregar Miembro Familiar' }}</h3>
          <button class="close-btn" @click="closeModal">✕</button>
        </div>

        <form class="modal-form" @submit.prevent="handleSaveMember">
          <div class="form-group">
            <label class="form-label">Nombre del Integrante</label>
            <input 
              v-model="name" 
              type="text" 
              class="form-input" 
              placeholder="Ej: María / Esposa" 
              required 
            />
          </div>

          <div class="form-group">
            <label class="form-label">Rol en el Hogar</label>
            <select v-model="role" class="form-input">
              <option value="Mamá">Mamá / Esposa</option>
              <option value="Papá">Papá / Esposo</option>
              <option value="Hijo">Hijo</option>
              <option value="Hija">Hija</option>
              <option value="Jefe de Hogar">Jefe de Hogar</option>
              <option value="Otro">Otro Miembro</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Seleccionar Avatar</label>
            <div class="avatar-picker">
              <button 
                v-for="av in avatarOptions" 
                :key="av" 
                type="button"
                class="avatar-option"
                :class="{ selected: selectedAvatar === av }"
                @click="selectedAvatar = av"
              >
                <AvatarImage :avatarId="av" :size="44" />
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Color Identificador del Miembro</label>
            <div class="color-picker">
              <button 
                v-for="c in colorOptions" 
                :key="c.hex" 
                type="button"
                class="color-chip"
                :style="{ background: c.hex }"
                :class="{ selected: selectedColor === c.hex }"
                @click="selectedColor = c.hex"
                :title="c.name"
              ></button>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="cancel-btn" @click="closeModal">Cancelar</button>
            <button type="submit" class="submit-btn" :disabled="isSubmitting">
              <span v-if="isSubmitting">Guardando...</span>
              <span v-else>{{ modalMode === 'edit' ? '✓ Guardar Cambios' : 'Guardar Miembro' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.family-page {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding-bottom: 5rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
}

@media (min-width: 640px) {
  .header-section {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }
}

.page-title {
  font-size: clamp(1.2rem, 4.5vw, 1.5rem);
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0 0;
  line-height: 1.35;
}

.add-member-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  border: none;
  padding: 0.75rem 1.25rem;
  min-height: 48px;
  border-radius: 14px;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: transform 0.15s, background 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .add-member-btn {
    width: auto;
  }
}

.add-member-btn:hover {
  transform: translateY(-1px);
}

.invite-code-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.15rem 1.25rem;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.12));
  border: 1px solid rgba(59, 130, 246, 0.3);
  box-sizing: border-box;
  width: 100%;
}

@media (min-width: 640px) {
  .invite-code-card {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
  }
}

.invite-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.invite-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.06em;
}

:root[data-theme="dark"] .invite-tag {
  color: #60a5fa;
}

.invite-code-text {
  font-size: clamp(1.4rem, 5vw, 1.8rem);
  font-weight: 900;
  letter-spacing: 0.08em;
  margin: 0;
  font-family: monospace, var(--font-main);
  color: var(--text-primary);
  word-break: break-all;
}

.invite-sub {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.35;
}

.copy-code-btn {
  padding: 0.75rem 1.2rem;
  min-height: 48px;
  border-radius: 14px;
  border: 1px solid rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  touch-action: manipulation;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 640px) {
  .copy-code-btn {
    width: auto;
  }
}

:root[data-theme="dark"] .copy-code-btn {
  color: #60a5fa;
}

.copy-code-btn:hover {
  background: #3b82f6;
  color: #ffffff;
}

.members-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
  width: 100%;
  box-sizing: border-box;
}

@media (min-width: 480px) {
  .members-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

.member-card {
  padding: 1.25rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-subtle);
  box-sizing: border-box;
  width: 100%;
}

.member-name {
  font-size: 1.1rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.member-role {
  font-size: 0.82rem;
  font-weight: 800;
}

.card-actions {
  margin-top: 0.4rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  width: 100%;
}

.edit-btn {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  padding: 0.5rem 0.85rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s, background 0.15s;
  flex: 1;
}

:root[data-theme="dark"] .edit-btn {
  color: #60a5fa;
}

.edit-btn:hover {
  background: #3b82f6;
  color: #ffffff;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
  padding: 0.5rem 0.85rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.empty-state {
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  border-radius: 24px;
}

.empty-icon {
  font-size: 3rem;
}

.empty-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.empty-desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  max-width: 400px;
  margin: 0;
  line-height: 1.35;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.2s ease;
}

@media (min-width: 640px) {
  .modal-backdrop {
    align-items: center;
    padding: 1.5rem;
  }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-card {
  width: 100%;
  max-width: 460px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-top-left-radius: 24px;
  border-top-right-radius: 24px;
  padding: 1.25rem 1.25rem calc(1.25rem + var(--sab));
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
  max-height: min(90dvh, 90vh);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  box-sizing: border-box;
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@media (min-width: 640px) {
  .modal-card {
    border-radius: 24px;
    padding: 1.75rem;
    max-height: 85vh;
  }
}

.sheet-grabber {
  width: 36px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.2);
  margin: -0.25rem auto 0.5rem auto;
}

@media (min-width: 640px) {
  .sheet-grabber {
    display: none;
  }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 800;
  margin: 0;
  color: var(--text-primary);
}

.close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  width: var(--touch-target-min);
  height: var(--touch-target-min);
  border-radius: 50%;
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  min-height: var(--touch-target-min);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(30, 41, 59, 0.8);
  color: #fff;
  font-size: 16px; /* Evita auto-zoom en iOS */
  outline: none;
  box-sizing: border-box;
  touch-action: manipulation;
}

.avatar-picker {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.6rem;
}

.avatar-option {
  background: transparent;
  border: 2px solid transparent;
  border-radius: 16px;
  padding: 6px;
  min-height: var(--touch-target-min);
  cursor: pointer;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-option.selected {
  border-color: #3b82f6;
  background: rgba(59, 130, 246, 0.15);
}

.color-picker {
  display: flex;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.color-chip {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  touch-action: manipulation;
}

.color-chip.selected {
  border-color: #fff;
  transform: scale(1.12);
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: var(--text-secondary);
  padding: 0.75rem 1.15rem;
  min-height: 48px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  touch-action: manipulation;
}

.submit-btn {
  background: #3b82f6;
  border: none;
  color: #fff;
  padding: 0.75rem 1.35rem;
  min-height: 48px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.88rem;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  flex: 1;
}

@media (min-width: 640px) {
  .submit-btn {
    flex: none;
  }
}
</style>
