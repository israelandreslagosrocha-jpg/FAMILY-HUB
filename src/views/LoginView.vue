<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const mode = ref<'login' | 'register'>('login')

const email = ref('israel@familyhub.cl')
const password = ref('P#2?hqfa2WK5Y$M')

// Campos para registro de familiar
const regName = ref('')
const regRole = ref('Mamá')
const regEmail = ref('')
const regPassword = ref('')

async function handleSubmit() {
  if (mode.value === 'login') {
    if (!email.value || !password.value) {
      authStore.authError = 'Por favor ingresa tu correo y contraseña.'
      return
    }
    await authStore.login(email.value, password.value)
  } else {
    if (!regEmail.value || !regPassword.value || !regName.value) {
      authStore.authError = 'Por favor completa todos los campos del registro.'
      return
    }
    const success = await authStore.registerFamilyUser(regEmail.value, regPassword.value, regName.value, regRole.value)
    if (success) {
      alert(`✅ Cuenta creada exitosamente para ${regName.value}. ¡Bienvenido(a) a FAMILY-HUB!`)
    }
  }
}

function setQuickCredentials(e: string, p: string) {
  email.value = e
  password.value = p
}
</script>

<template>
  <div class="login-page-container">
    <div class="login-card glass-card">
      <div class="card-brand">
        <div class="brand-badge">FH</div>
        <h1 class="brand-title">FAMILY-HUB</h1>
        <p class="brand-subtitle">Centro Privado de Gestión Familiar</p>
      </div>

      <div class="mode-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: mode === 'login' }"
          @click="mode = 'login'; authStore.authError = null"
        >
          🔑 Iniciar Sesión
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: mode === 'register' }"
          @click="mode = 'register'; authStore.authError = null"
        >
          ➕ Crear Cuenta Familiar
        </button>
      </div>

      <!-- Alerta de Error -->
      <div v-if="authStore.authError" class="auth-error-alert">
        <span>⚠️ {{ authStore.authError }}</span>
      </div>

      <!-- Formulario de Iniciar Sesión -->
      <form v-if="mode === 'login'" class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Correo Electrónico</label>
          <input 
            v-model="email" 
            type="email" 
            class="form-input" 
            placeholder="ejemplo@familyhub.cl" 
            required 
          />
        </div>

        <div class="form-group">
          <label class="form-label">Contraseña</label>
          <input 
            v-model="password" 
            type="password" 
            class="form-input" 
            placeholder="••••••••" 
            required 
          />
        </div>

        <button type="submit" class="submit-btn" :disabled="authStore.isLoading">
          <span v-if="authStore.isLoading" class="spinner"></span>
          <span v-else>🚀 Ingresar a FAMILY-HUB</span>
        </button>

        <div class="quick-access">
          <span class="quick-title">Cuentas creadas para pruebas:</span>
          <div class="quick-buttons">
            <button 
              type="button" 
              class="quick-chip"
              @click="setQuickCredentials('israel@familyhub.cl', 'P#2?hqfa2WK5Y$M')"
            >
              👨‍👩‍👦 Israel (israel@familyhub.cl)
            </button>
          </div>
        </div>
      </form>

      <!-- Formulario de Registro para Esposa / Familiar -->
      <form v-else class="auth-form" @submit.prevent="handleSubmit">
        <div class="form-group">
          <label class="form-label">Nombre del Familiar</label>
          <input 
            v-model="regName" 
            type="text" 
            class="form-input" 
            placeholder="Ej: Esposa / María" 
            required 
          />
        </div>

        <div class="form-group">
          <label class="form-label">Rol en el Hogar</label>
          <select v-model="regRole" class="form-input">
            <option value="Mamá">Mamá / Esposa</option>
            <option value="Papá">Papá / Esposo</option>
            <option value="Hijo">Hijo</option>
            <option value="Hija">Hija</option>
            <option value="Otro">Otro Miembro</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Correo Electrónico de Acceso</label>
          <input 
            v-model="regEmail" 
            type="email" 
            class="form-input" 
            placeholder="esposa@familyhub.cl" 
            required 
          />
        </div>

        <div class="form-group">
          <label class="form-label">Crear Contraseña</label>
          <input 
            v-model="regPassword" 
            type="password" 
            class="form-input" 
            placeholder="Contraseña segura" 
            required 
          />
        </div>

        <button type="submit" class="submit-btn" :disabled="authStore.isLoading">
          <span v-if="authStore.isLoading" class="spinner"></span>
          <span v-else>✨ Registrar e Ingresar</span>
        </button>
      </form>

      <div class="card-footer">
        <span>🔒 Autenticación Segura mediante Supabase Auth & RLS</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page-container {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(1rem, var(--sat)) var(--space-4) max(1.5rem, var(--sab)) var(--space-4);
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
}

.login-card {
  width: 100%;
  max-width: 440px;
  padding: clamp(1.25rem, 5vw, 2.25rem);
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .login-card {
    background: rgba(15, 23, 42, 0.92);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  }
}

.card-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.35rem;
}

.brand-badge {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  color: #fff;
  font-weight: 800;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35);
}

.brand-title {
  font-size: 1.45rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  margin: 0;
  color: var(--text-primary);
}

.brand-subtitle {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
}

.mode-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.05);
  padding: 4px;
  border-radius: 14px;
  gap: 4px;
}

:root[data-theme="dark"] .mode-tabs {
  background: rgba(255, 255, 255, 0.06);
}

.tab-btn {
  flex: 1;
  padding: 0.55rem;
  min-height: var(--touch-target-min);
  border-radius: 10px;
  border: none;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #ffffff;
  color: #1e293b;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:root[data-theme="dark"] .tab-btn.active {
  background: #334155;
  color: #ffffff;
}

.auth-error-alert {
  padding: 0.65rem 0.85rem;
  border-radius: 12px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  color: #991b1b;
  font-size: 0.8rem;
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .auth-error-alert {
    background: rgba(185, 28, 28, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;
  }
}

.auth-form {
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
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.form-input {
  width: 100%;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  background: rgba(255, 255, 255, 0.8);
  font-size: 16px;
  line-height: 1.4;
  color: var(--text-primary);
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.2s;
  min-height: var(--touch-target-min);
}

@media (prefers-color-scheme: dark) {
  .form-input {
    background: rgba(30, 41, 59, 0.8);
    border-color: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }
}

.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.submit-btn {
  width: 100%;
  padding: 0.85rem;
  min-height: 48px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4);
  transition: transform 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 0.5rem;
}

.submit-btn:hover {
  transform: scale(1.02);
}

.quick-access {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.5rem;
  border-top: 1px dashed rgba(0, 0, 0, 0.1);
}

@media (prefers-color-scheme: dark) {
  .quick-access { border-top-color: rgba(255, 255, 255, 0.1); }
}

.quick-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.quick-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.quick-chip {
  padding: 0.45rem 0.75rem;
  min-height: var(--touch-target-min);
  border-radius: 10px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.08);
  color: #3b82f6;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.quick-chip:hover {
  background: rgba(59, 130, 246, 0.2);
}

.card-footer {
  text-align: center;
  font-size: 0.72rem;
  color: var(--text-secondary);
  opacity: 0.8;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>
