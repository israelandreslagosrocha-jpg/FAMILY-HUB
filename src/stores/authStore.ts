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
  const isUnlinkedUser = ref<boolean>(false)
  const familyInviteCode = ref<string>('LAGOS-FAMILY')

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
        isUnlinkedUser.value = false
      }
    })
  }

  // Cargar miembros familiares reales desde Supabase
  async function loadFamilyMembers() {
    if (!user.value) return

    try {
      // 1. Intentar auto-vinculación silenciosa por correo si corresponde
      try {
        await supabase.rpc('auto_link_member_by_email')
      } catch (e) {
        // Ignorar si la función no está desplegada aún
      }

      // 2. Cargar código de invitación del hogar si el usuario pertenece a una familia
      try {
        const { data: famData } = await supabase.from('families').select('invite_code').limit(1)
        if (famData && famData.length > 0 && famData[0].invite_code) {
          familyInviteCode.value = famData[0].invite_code
        }
      } catch (e) {
        // Fallback a LAGOS-FAMILY
      }

      // 3. Cargar miembros familiares del hogar del usuario
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
        isUnlinkedUser.value = false
        const validMembers = data.filter((m: any) => {
          const n = (m.name || '').toLowerCase()
          if (n.includes('prueba') || n.includes('esposa') || (n === 'vicente' && m.role === 'Mamá')) {
            return false
          }
          return true
        })

        familyMembers.value = validMembers.map((m: any, idx: number) => ({
          id: m.id,
          name: m.name || m.role || 'Familiar',
          avatarId: m.avatar_id || `avatar-0${(idx % 4) + 1}`,
          color: m.color || (idx === 0 ? '#3b82f6' : idx === 1 ? '#ec4899' : '#10b981'),
          role: m.role || 'Miembro',
          isActive: m.is_active !== false,
          email: m.email || undefined
        }))

        // Seleccionar por defecto el perfil vinculado al usuario autenticado
        const myProfile = data.find((m: any) => m.profile_id === user.value?.id)
        if (myProfile) {
          activeMemberId.value = myProfile.id
        } else {
          activeMemberId.value = data[0].id
        }
      } else {
        // El usuario está autenticado pero no está vinculado a una familia en Supabase
        isUnlinkedUser.value = true
        familyMembers.value = []
        activeMemberId.value = null
      }
    } catch (err: any) {
      console.error('Error al procesar miembros familiares:', err.message)
    }
  }

  /**
   * Obtener integrantes disponibles de una familia por su código de invitación
   */
  async function fetchMembersByInviteCode(inviteCode: string) {
    try {
      const { data, error } = await supabase.rpc('get_unlinked_family_members_by_code', {
        p_invite_code: inviteCode
      })
      if (error) throw error
      return data || []
    } catch (err: any) {
      console.error('Error al consultar familia por código:', err.message)
      throw err
    }
  }

  /**
   * Vincular la cuenta actual del usuario a un perfil de la familia seleccionada
   */
  async function linkMemberProfile(inviteCode: string, memberId: string): Promise<boolean> {
    isLoading.value = true
    authError.value = null
    try {
      // 1. Garantizar perfil en public.profiles para prevenir fallo de clave foránea
      if (user.value) {
        await supabase.from('profiles').upsert({
          id: user.value.id,
          display_name: user.value.email?.split('@')[0] || 'Familiar'
        })
      }

      // 2. Ejecutar vinculación por RPC
      const { data, error } = await supabase.rpc('link_member_profile', {
        p_invite_code: inviteCode,
        p_member_id: memberId
      })

      if (error) {
        authError.value = error.message
        return false
      }

      if (data) {
        await loadFamilyMembers()
        return true
      }
      return false
    } catch (err: any) {
      authError.value = err.message || 'Error al vincular perfil.'
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Elimina a un integrante de la familia de forma reactiva y persistente
   */
  async function deleteFamilyMember(memberId: string) {
    familyMembers.value = familyMembers.value.filter(m => m.id !== memberId)

    if (activeMemberId.value === memberId && familyMembers.value.length > 0) {
      activeMemberId.value = familyMembers.value[0].id
    }

    if (!memberId.startsWith('m-') && !memberId.startsWith('temp-')) {
      try {
        await supabase.from('family_members').update({ is_active: false }).eq('id', memberId)
        await supabase.from('family_members').delete().eq('id', memberId)
      } catch (err: any) {
        console.warn('Advertencia al eliminar miembro de Supabase:', err.message)
      }
    }
  }

  /**
   * Actualiza el perfil (nombre, rol, avatar, color) de un integrante de la familia
   */
  async function updateFamilyMember(memberId: string, payload: { name?: string; role?: string; avatarId?: string; color?: string }) {
    const member = familyMembers.value.find(m => m.id === memberId)
    if (member) {
      if (payload.name) member.name = payload.name
      if (payload.role) member.role = payload.role
      if (payload.avatarId) member.avatarId = payload.avatarId
      if (payload.color) member.color = payload.color
    }

    if (!memberId.startsWith('m-') && !memberId.startsWith('temp-')) {
      try {
        const updateData: any = {}
        if (payload.name) updateData.name = payload.name
        if (payload.role) updateData.role = payload.role
        if (payload.avatarId) updateData.avatar_id = payload.avatarId
        if (payload.color) updateData.color = payload.color

        await supabase.from('family_members').update(updateData).eq('id', memberId)
      } catch (err: any) {
        console.warn('Advertencia al actualizar miembro en Supabase:', err.message)
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

  // Cerrar Sesión Defensivo Garantizado
  async function logout() {
    isLoading.value = true
    try {
      await supabase.auth.signOut()
    } catch (err: any) {
      console.warn('⚠️ Warning al cerrar sesión en Supabase:', err?.message)
    } finally {
      user.value = null
      session.value = null
      familyMembers.value = []
      activeMemberId.value = null
      isUnlinkedUser.value = false
      isLoading.value = false
      window.location.href = '/'
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
    isUnlinkedUser,
    familyInviteCode,
    initAuth,
    loadFamilyMembers,
    fetchMembersByInviteCode,
    linkMemberProfile,
    login,
    registerFamilyUser,
    logout,
    setActiveMember,
    deleteFamilyMember,
    updateFamilyMember
  }
})
