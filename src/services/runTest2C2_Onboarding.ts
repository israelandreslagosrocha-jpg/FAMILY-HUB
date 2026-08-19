import { supabase } from './supabaseClient'

async function runOnboardingTest() {
  console.log('=== ETAPA 2C.2 & 2C.3: AUTENTICACIÓN Y ONBOARDING IDEMPOTENTE ===\n')

  // 1. Iniciar sesión anónima (Obtiene JWT de rol authenticated y auth.uid() sin rate limit de email)
  const { data: authData, error: authErr } = await supabase.auth.signInAnonymously()

  if (authErr) {
    console.error('❌ Error en signInAnonymously:', authErr.message)
    return
  }

  const user = authData?.user
  if (!user) {
    console.error('❌ No se obtuvo usuario autenticado.')
    return
  }

  console.log(`✅ Usuario A autenticado (Role: authenticated) con JWT: ${user.id}`)

  // 2. Ejecutar RPC de Onboarding Inicial
  console.log('\n🚀 Ejecutando RPC public.onboard_first_family...')
  const { data: familyId, error: onboardErr } = await supabase.rpc('onboard_first_family', {
    p_family_name: 'Familia Lagos',
    p_member_name: 'Israel',
    p_avatar_id: 'avatar-01',
    p_color: '#3b82f6',
    p_role: 'Papá'
  })

  if (onboardErr) {
    console.error('❌ Error en onboarding RPC:', onboardErr.message)
    return
  }
  
  console.log(`🎉 ONBOARDING COMPLETADO EXITOSAMENTE. Family ID creada: ${familyId}`)

  // 3. Probar reintento inmediato (Test 2C.3b: Idempotencia y Advisory Lock)
  console.log('\n🧪 Probando reintento inmediato de Onboarding (Test 2C.3b Idempotencia)...')
  const { error: retryErr } = await supabase.rpc('onboard_first_family', {
    p_family_name: 'Segunda Familia',
    p_member_name: 'Israel Reintento',
    p_avatar_id: 'avatar-01',
    p_color: '#3b82f6',
    p_role: 'Papá'
  })

  if (retryErr && retryErr.message.includes('ya pertenece a una familia activa')) {
    console.log(`✅ TEST 2C.3b PASS: Rechazado correctamente por idempotencia -> "${retryErr.message}"`)
  } else if (retryErr) {
    console.log(`ℹ️ Error en reintento: ${retryErr.message}`)
  } else {
    console.error('❌ FAIL: Permitió crear una segunda familia al mismo usuario.')
  }

  // 4. Verificar datos creados bajo RLS
  const { data: myMembers } = await supabase.from('family_members').select('*')
  console.log(`\n📋 Miembros de familia visibles bajo RLS para Usuario A (${myMembers?.length} registros):`)
  myMembers?.forEach(m => console.log(`   - Miembro: ${m.name} | Role: ${m.role} | Avatar: ${m.avatar_id} | Profile: ${m.profile_id}`))

  const { data: myCategories } = await supabase.from('categories').select('*')
  console.log(`\n📋 Categorías iniciales creadas por el sistema (${myCategories?.length} registros):`)
  myCategories?.forEach(c => console.log(`   - [${c.type}] ${c.name} (${c.color})`))
}

runOnboardingTest()
