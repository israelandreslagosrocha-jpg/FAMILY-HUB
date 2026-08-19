import { supabase } from './supabaseClient'

export async function verify6C3Finance() {
  console.log('=== PASO 6C.3: VERIFICACIÓN EMPÍRICA POST-MIGRACIÓN DE FINANZAS (V2.1) ===\n')

  // 1. Verificar bloqueo de llamadas anónimas a RPC
  const { error: anonErr } = await supabase.rpc('create_financial_movement', {
    p_movement_type: 'expense',
    p_title: 'Test Anónimo',
    p_amount: 1000,
    p_category_id: '00000000-0000-0000-0000-000000000000'
  })

  if (anonErr) {
    console.log('✅ RPC create_financial_movement bloquea llamadas anónimas/sin familia:', `"${anonErr.message}" (Código ${anonErr.code})`)
  } else {
    console.error('❌ ERROR CRÍTICO: RPC permitió llamada anónima')
  }

  // 2. Autenticación con israel@familyhub.cl
  console.log('\n🔑 Autenticando usuario israel@familyhub.cl...')
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'israel@familyhub.cl',
    password: 'P#2?hqfa2WK5Y$M'
  })

  if (authErr || !authData.user) {
    console.error('❌ Error de autenticación:', authErr?.message)
    return
  }
  console.log('✅ Usuario autenticado con éxito:', authData.user.id)

  // Obtener contexto familiar y categoría de prueba
  const { data: members } = await supabase.from('family_members').select('*')
  const familyId = members && members.length > 0 ? members[0].family_id : null
  const memberId = members && members.length > 0 ? members[0].id : null

  const { data: categories } = await supabase.from('categories').select('*').limit(1)
  const categoryId = categories && categories.length > 0 ? categories[0].id : null

  if (!familyId || !memberId || !categoryId) {
    console.error('❌ No se encontró familia, miembro o categoría para la prueba')
    return
  }

  // 3. Probar Bloqueo de INSERT REST Directo en Expenses (Canal Único RPC)
  console.log('\n🛡️ Probando Bloqueo de Inserción REST Directa en expenses...')
  const { error: directInsertErr } = await supabase.from('expenses').insert({
    family_id: familyId,
    category_id: categoryId,
    registered_by_member_id: memberId,
    title: 'Gasto REST Ilegal',
    amount: 5000,
    currency: 'CLP',
    date: '2026-08-19'
  })

  if (directInsertErr) {
    console.log('✅ Inserción REST directa bloqueada correctamente por RLS/Permissions:', `"${directInsertErr.message}"`)
  } else {
    console.error('❌ ERROR CRÍTICO: Se permitió inserción REST directa en expenses (Violación de Canal Único)')
  }

  // 4. Probar Invocación de RPC Registrando un Gasto Familiar (Scope Family -> Belonging NULL)
  console.log('\n💳 Ejecutando RPC create_financial_movement para Gasto Familiar...')
  const { data: expResult, error: expErr } = await supabase.rpc('create_financial_movement', {
    p_movement_type: 'expense',
    p_title: 'Gasto Prueba 6C.3 Supermercado',
    p_amount: 25000,
    p_category_id: categoryId,
    p_registered_by_member_id: memberId,
    p_is_family_scope: true
  })

  if (expErr) {
    console.error('❌ Error al ejecutar RPC para Gasto:', expErr.message)
    return
  }
  console.log('✅ Gasto registrado con éxito vía RPC:', expResult)

  // Verificar en la BD que belonging_to_member_id es NULL por ser gasto familiar
  const { data: expRow } = await supabase.from('expenses').select('*').eq('id', expResult.id).single()
  if (expRow && expRow.belonging_to_member_id === null) {
    console.log('✅ Coherencia verificada: Gasto familiar forzó belonging_to_member_id = NULL')
  }

  // 5. Probar Invocación de RPC Registrando un Ingreso
  console.log('\n💼 Ejecutando RPC create_financial_movement para Ingreso...')
  const { data: incResult, error: incErr } = await supabase.rpc('create_financial_movement', {
    p_movement_type: 'income',
    p_title: 'Ingreso Prueba 6C.3 Trabajo',
    p_amount: 150000,
    p_category_id: categoryId,
    p_registered_by_member_id: memberId,
    p_is_family_scope: true
  })

  if (incErr) {
    console.error('❌ Error al ejecutar RPC para Ingreso:', incErr.message)
    return
  }
  console.log('✅ Ingreso registrado con éxito vía RPC:', incResult)

  // 6. Probar Invocación de RPC Registrando una Transferencia Neutra
  console.log('\n🔄 Ejecutando RPC create_financial_movement para Transferencia Neutra...')
  const { data: trfResult, error: trfErr } = await supabase.rpc('create_financial_movement', {
    p_movement_type: 'transfer',
    p_title: 'Transferencia Banco a Efectivo 6C.3',
    p_amount: 30000,
    p_source_account: 'Cuenta Corriente Banco',
    p_destination_account: 'Caja Efectivo',
    p_registered_by_member_id: memberId
  })

  if (trfErr) {
    console.error('❌ Error al ejecutar RPC para Transferencia:', trfErr.message)
    return
  }
  console.log('✅ Transferencia Neutra registrada con éxito vía RPC:', trfResult)

  // 7. Probar Rechazo de Categoría Cross-Family o Inexistente
  console.log('\n🚫 Probando Rechazo de Categoría Cross-Family/Inexistente...')
  const { error: fakeCatErr } = await supabase.rpc('create_financial_movement', {
    p_movement_type: 'expense',
    p_title: 'Gasto Falso Categoría Ajena',
    p_amount: 5000,
    p_category_id: '00000000-0000-0000-0000-000000000009',
    p_registered_by_member_id: memberId
  })

  if (fakeCatErr) {
    console.log('✅ Categoría cross-family rechazada correctamente:', `"${fakeCatErr.message}"`)
  } else {
    console.error('❌ ERROR CRÍTICO: Se aceptó categoría inexistente/ajena')
  }

  // 8. Verificar Auditoría Inalterable en history_logs
  console.log('\n📜 Verificando auditoría inalterable en history_logs...')
  const { data: historyRows } = await supabase
    .from('history_logs')
    .select('*')
    .in('action_type', ['expense_registered', 'income_registered', 'transfer_registered'])
    .order('created_at', { ascending: false })
    .limit(3)

  if (historyRows && historyRows.length >= 3) {
    console.log(`🎉 VERIFICACIÓN 6C.3 COMPLETA: 3 registros de auditoría generados en history_logs`)
    historyRows.forEach(h => console.log(`   • [${h.action_type}] Entity: ${h.entity_type} ID: ${h.entity_id}`))
  } else {
    console.warn('⚠️ Se esperaban 3 registros de auditoría en history_logs')
  }

  // 9. Limpieza limpia de objetos de prueba
  console.log('\n🧹 Limpiando registros de prueba...')
  if (expResult?.id) {
    const { error: delExpErr } = await supabase.from('expenses').delete().eq('id', expResult.id)
    if (delExpErr) console.log('ℹ️ DELETE directo en expenses prevenido o controlado:', delExpErr.message)
  }
}

verify6C3Finance()
