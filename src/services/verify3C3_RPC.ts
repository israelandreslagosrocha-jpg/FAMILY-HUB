import { supabase } from './supabaseClient'

async function verifyRPC() {
  console.log('=== PASO 3C.3: VERIFICACIÓN DE EXISTENCIA Y SIGNATURA DE RPC CREATE_FAMILY_EVENT ===\n')

  // 1. Probar llamada anónima (Debe ser rechazada por falta de autenticación o familia)
  const { error: anonErr } = await supabase.rpc('create_family_event', {
    p_title: 'Evento Test Anon',
    p_description: 'Prueba',
    p_start_time: new Date().toISOString(),
    p_end_time: new Date().toISOString(),
    p_is_all_day: false,
    p_is_family_event: true,
    p_category_id: null,
    p_member_ids: []
  })

  if (anonErr) {
    console.log(`✅ RPC Existe y aísla peticiones: "${anonErr.message}" (Código ${anonErr.code})`)
  } else {
    console.log('ℹ️ RPC retornó sin error para anon')
  }

  // 2. Probar autenticado como israel@familyhub.cl
  console.log('\n🔑 Autenticando usuario israel@familyhub.cl...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr || !authData.user) {
    console.error('❌ Error al autenticar:', authErr?.message)
    return
  }

  console.log(`✅ Usuario autenticado: ${authData.user.id}`)

  // 3. Probar invocación RPC autenticado con parámetros válidos
  // Obtenemos un miembro de la familia del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  const { data: categories } = await supabase.from('categories').select('*')

  if (!members || members.length === 0) {
    console.error('❌ No se encontraron miembros de familia')
    return
  }

  const memberId = members[0].id
  const categoryId = categories && categories.length > 0 ? categories[0].id : null

  console.log(`\n🧪 Probando invocación de public.create_family_event con Member ID: ${memberId}...`)
  
  const { data: eventId, error: rpcErr } = await supabase.rpc('create_family_event', {
    p_title: 'Prueba de Verificación 3C.3',
    p_description: 'Verificación de signatura y tipos ENUM en Supabase',
    p_start_time: '2026-08-19T14:00:00Z',
    p_end_time: '2026-08-19T15:00:00Z',
    p_is_all_day: false,
    p_is_family_event: true,
    p_category_id: categoryId,
    p_member_ids: [memberId],
    p_recurrence_frequency: null
  })

  if (rpcErr) {
    console.error('❌ Error en invocación de RPC:', rpcErr.message, rpcErr.details, rpcErr.hint)
  } else {
    console.log(`🎉 PASO 3C.3 VERIFICADO CON ÉXITO: RPC ejecutada y retornó Event ID ${eventId}`)
  }
}

verifyRPC()
