import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../services/supabaseClient'
import type { User, Session } from '@supabase/supabase-js'
import type { FamilyMember } from '../types'

export const useAuthStore = defineStore('authStore', () => {
  const user = ref<User | null>(null)
  const session = ref<Session | null>(null)
  const familyMembers = ref<FamilyMember[]>([])
  const activeMemberId = ref<string | null>(null)
  const isLoading = ref<boolean>(true)
  const authError = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)

  const activeMember = computed<FamilyMember | null>(() => {
    if (!activeMemberId.value) return familyMembers.value[0] || null
    return familyMembers.value.find(m => m.id === activeMemberId.value) || familyMembers.value[0] || null
  })

  // Inicializar estado de Auth en carga
  async function initAuth() {
    isLoading.value = true
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      user.value = data.session?.user || null

      if (user.value) {
        await loadFamilyMembers()
      }
    } catch (err: any) {
      console.error('Error al inicializar Auth:', err.message)
    } finally {
      isLoading.value = false
    }

    // Escuchar cambios de sesión
    supabase.auth.onAuthStateChange(async (_event, newSession) => {
      session.value = newSession
      user.value = newSession?.user || null

      if (user.value) {
        await loadFamilyMembers()
      } else {
        familyMembers.value = []
        activeMemberId.value = null
      }
    })
  }

  // Cargar miembros familiares reales desde Supabase
  async function loadFamilyMembers() {
    if (!user.value) return

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error al cargar miembros familiares:', error.message)
        return
      }

      if (data && data.length > 0) {
        familyMembers.value = data.map((m: any, idx: number) => ({
          id: m.id,
          name: m.name || m.role || 'Familiar',
          avatarId: m.avatar_id || `avatar-0${(idx % 4) + 1}`,
          color: m.color || (idx === 0 ? '#3b82f6' : idx === 1 ? '#ec4899' : '#10b981'),
          role: m.role || 'Miembro',
          isActive: m.is_active !== false
        }))

        // Seleccionar por defecto el perfil vinculado al usuario autenticado
        const myProfile = data.find((m: any) => m.profile_id === user.value?.id)
        if (myProfile) {
          activeMemberId.value = myProfile.id
        } else {
          activeMemberId.value = data[0].id
        }
      } else {
        // Si no existen miembros en la BD aún para esta familia, crear perfil inicial
        familyMembers.value = [{
          id: 'm-default',
          name: user.value.email?.split('@')[0] || 'Israel',
          avatarId: 'avatar-01',
          color: '#3b82f6',
          role: 'Papá',
          isActive: true
        }]
        activeMemberId.value = 'm-default'
      }
    } catch (err: any) {
      console.error('Error al procesar miembros familiares:', err.message)
    }
  }

  /**
   * Elimina a un integrante de la familia de forma reactiva y persistente
   */
  async function deleteFamilyMember(memberId: string) {
    // 1. Quitar de la lista local de forma reactiva e inmediata
    familyMembers.value = familyMembers.value.filter(m => m.id !== memberId)

    // 2. Si el miembro activo era el eliminado, conmutar al Jefe de Hogar
    if (activeMemberId.value === memberId && familyMembers.value.length > 0) {
      activeMemberId.value = familyMembers.value[0].id
    }

    // 3. Persistir borrado en Supabase
    if (!memberId.startsWith('m-') && !memberId.startsWith('temp-')) {
      try {
        await supabase.from('family_members').update({ is_active: false }).eq('id', memberId)
        await supabase.from('family_members').delete().eq('id', memberId)
      } catch (err: any) {
        console.warn('Advertencia al eliminar miembro de Supabase:', err.message)
      }
    }
  }

  // Iniciar Sesión con Supabase Auth
  async function login(email: string, pass: string): Promise<boolean> {
    authError.value = null
    isLoading.value = true

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass
      })

      if (error) {
        authError.value = error.message === 'Invalid login credentials' 
          ? 'Correo electrónico o contraseña incorrectos en Supabase.' 
          : error.message
        return false
      }

      session.value = data.session
      user.value = data.user
      await loadFamilyMembers()
      return true
    } catch (err: any) {
      authError.value = err.message || 'Error al iniciar sesión.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Registrar cuenta para Familiar en Supabase Auth
  async function registerFamilyUser(email: string, pass: string, name: string, role: string): Promise<boolean> {
    authError.value = null
    isLoading.value = true

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: { name, role }
        }
      })

      if (error) {
        authError.value = error.message
        return false
      }

      if (data.user) {
        session.value = data.session
        user.value = data.user
        await loadFamilyMembers()
      }
      return true
    } catch (err: any) {
      authError.value = err.message || 'Error al registrar cuenta.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  // Cerrar Sesión
  async function logout() {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
      user.value = null
      session.value = null
      familyMembers.value = []
      activeMemberId.value = null
    } catch (err: any) {
      console.error('Error al cerrar sesión:', err.message)
    } finally {
      isLoading.value = false
    }
  }

  function setActiveMember(id: string) {
    activeMemberId.value = id
  }

  return {
    user,
    session,
    familyMembers,
    activeMemberId,
    activeMember,
    isLoading,
    authError,
    isAuthenticated,
    initAuth,
    loadFamilyMembers,
    login,
    registerFamilyUser,
    logout,
    setActiveMember,
    deleteFamilyMember
  }
})
