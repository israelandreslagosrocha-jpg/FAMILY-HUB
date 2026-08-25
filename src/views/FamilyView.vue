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

    <!-- Modal Formulario Agregar / Editar Miembro -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card glass-card">
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
  gap: 1.5rem;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.page-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin: 0.2rem 0 0 0;
}

.add-member-btn {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  border: none;
  padding: 0.65rem 1.1rem;
  border-radius: 14px;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.35);
  transition: transform 0.15s;
}

.add-member-btn:hover {
  transform: scale(1.03);
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

.member-card {
  padding: 1.5rem;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  text-align: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.member-name {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.member-role {
  font-size: 0.8rem;
  font-weight: 700;
}

.card-actions {
  margin-top: 0.4rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
}

.edit-btn {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}

.edit-btn:hover {
  background: #3b82f6;
  color: #ffffff;
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #f87171;
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.2);
}

.head-of-household-badge {
  font-size: 0.75rem;
  font-weight: 700;
  color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
  padding: 0.35rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.empty-state {
  padding: 3rem 2rem;
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
  font-weight: 700;
  margin: 0;
}

.empty-desc {
  font-size: 0.88rem;
  color: var(--text-secondary);
  max-width: 400px;
  margin: 0;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 24px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.modal-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
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
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(30, 41, 59, 0.8);
  color: #fff;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
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
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &.selected {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.15);
  }
}

.color-picker {
  display: flex;
  gap: 0.6rem;
}

.color-chip {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;

  &.selected {
    border-color: #fff;
    transform: scale(1.15);
  }
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
  padding: 0.65rem 1rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.submit-btn {
  background: #3b82f6;
  border: none;
  color: #fff;
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.invite-code-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12), rgba(139, 92, 246, 0.12));
  border: 1px solid rgba(59, 130, 246, 0.3);
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.invite-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.invite-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: #3b82f6;
  letter-spacing: 0.06em;
}

.invite-code-text {
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.08em;
  margin: 0;
  font-family: monospace, var(--font-main);
  color: var(--text-primary);
}

.invite-sub {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
}

.copy-code-btn {
  padding: 0.65rem 1.2rem;
  border-radius: 14px;
  border: 1px solid rgba(59, 130, 246, 0.4);
  background: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-weight: 800;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-code-btn:hover {
  background: #3b82f6;
  color: #ffffff;
}
</style>
