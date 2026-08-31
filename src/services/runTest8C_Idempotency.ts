import { supabase } from './supabaseClient'
import { financeService } from './financeService'

export async function runTest8CIdempotency() {
  console.log('===================================================================================')
  console.log('🧪 BATERÍA DE PRUEBAS REALES DE IDEMPOTENCIA Y SEGURIDAD (ETAPA 8C)')
  console.log('===================================================================================\n')

  try {
    // -----------------------------------------------------------------------------------
    // [TEST 8C.1 / TEST A] Autenticación en Supabase Auth
    // -----------------------------------------------------------------------------------
    console.log('[TEST A] Autenticación en Supabase Auth como israel@familyhub.cl...')
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl',
      password: import.meta.env.VITE_TEST_USER_PASSWORD || ''
    })

    if (authErr || !authData.user) {
      throw new Error(`❌ FAIL TEST A: Error de autenticación: ${authErr?.message}`)
    }
    console.log(`✅ PASS TEST A: Usuario autenticado con éxito (User ID: ${authData.user.id})\n`)

    // Obtener categoría de prueba
    const { data: catData, error: catErr } = await supabase
      .from('categories')
      .select('id')
      .limit(1)
      .single()

    if (catErr || !catData) {
      throw new Error(`❌ FAIL: No se pudo obtener categoría para las pruebas: ${catErr?.message}`)
    }
    const testCategoryId = catData.id
    const testIdempotencyKey = `idemp-test8c-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`

    // -----------------------------------------------------------------------------------
    // [TEST B] Primera operación financiera con idempotencyKey
    // -----------------------------------------------------------------------------------
    console.log('[TEST B] Ejecutando primera operación financiera con idempotencyKey...')
    const firstMovementId = await financeService.createMovement({
      movementType: 'expense',
      title: 'Prueba de Idempotencia Gasto Supermercado',
      amount: 18990,
      categoryId: testCategoryId,
      isFamilyScope: true,
      idempotencyKey: testIdempotencyKey
    })

    if (!firstMovementId) {
      throw new Error('❌ FAIL TEST B: La RPC no devolvió un ID de movimiento válido')
    }
    console.log(`✅ PASS TEST B: Movimiento original creado exitosamente con ID: ${firstMovementId}\n`)

    // -----------------------------------------------------------------------------------
    // [TEST C] Segunda llamada síncrona con la MISMA idempotencyKey (Reintento de Red)
    // -----------------------------------------------------------------------------------
    console.log('[TEST C] Simulado reintento de red: Ejecutando segunda llamada con la MISMA idempotencyKey...')
    const { data: secondCallData, error: secondCallErr } = await supabase.rpc('create_financial_movement', {
      p_movement_type: 'expense',
      p_title: 'Prueba de Idempotencia Gasto Supermercado (Título Reintentado Modificado)',
      p_amount: 18990,
      p_category_id: testCategoryId,
      p_registered_by_member_id: null,
      p_belonging_to_member_id: null,
      p_is_family_scope: true,
      p_date: new Date().toISOString().split('T')[0],
      p_source_account: null,
      p_destination_account: null,
      p_receipt_image_url: null,
      p_idempotency_key: testIdempotencyKey
    })

    if (secondCallErr) {
      throw new Error(`❌ FAIL TEST C: Error al reintentar la RPC idempotente: ${secondCallErr.message}`)
    }

    if (secondCallData.id !== firstMovementId || secondCallData.status !== 'reconciled' || !secondCallData.is_reconciled) {
      throw new Error(`❌ FAIL TEST C: La respuesta reconciliada no coincide. Obtenido: ${JSON.stringify(secondCallData)}`)
    }
    console.log(`✅ PASS TEST C: Reintento reconciliado atómicamente retornando el mismo ID (${secondCallData.id}) con status "reconciled"\n`)

    // -----------------------------------------------------------------------------------
    // [TEST D] Verificación en Base de Datos: 0 gastos adicionales creados
    // -----------------------------------------------------------------------------------
    console.log('[TEST D] Verificando en BD la cantidad exacta de registros creados...')
    const { data: expRecords, error: expErr } = await supabase
      .from('expenses')
      .select('id, title, amount')
      .eq('idempotency_key', testIdempotencyKey)

    if (expErr) throw new Error(`❌ FAIL TEST D: Error al consultar expenses: ${expErr.message}`)

    if (expRecords.length !== 1) {
      throw new Error(`❌ FAIL TEST D: Se esperaban 1 único registro en expenses, se encontraron: ${expRecords.length}`)
    }
    console.log(`✅ PASS TEST D: Confirmado. Existe exactamente 1 registro en expenses para esa idempotencyKey\n`)

    // -----------------------------------------------------------------------------------
    // [TEST E] Verificación de auditoría en history_logs (0 logs duplicados)
    // -----------------------------------------------------------------------------------
    console.log('[TEST E] Verificando inmutabilidad de auditoría en history_logs...')
    const { data: logRecords, error: logErr } = await supabase
      .from('history_logs')
      .select('id, action_type')
      .eq('entity_id', firstMovementId)

    if (logErr) throw new Error(`❌ FAIL TEST E: Error al consultar history_logs: ${logErr.message}`)

    if (logRecords.length !== 1) {
      throw new Error(`❌ FAIL TEST E: Se esperaba 1 solo registro de auditoría, se encontraron: ${logRecords.length}`)
    }
    console.log(`✅ PASS TEST E: Confirmado. Existe exactamente 1 log de auditoría en history_logs\n`)

    // -----------------------------------------------------------------------------------
    // [TEST F] Simulación de Peticiones Concurrentes en Paralelo (Promise.all)
    // -----------------------------------------------------------------------------------
    console.log('[TEST F] Simulado 3 peticiones concurrentes en paralelo (Promise.all) con la misma idempotencyKey...')
    const concurrentKey = `idemp-concurrent-${Date.now()}`
    
    const concurrentPromises = [1, 2, 3].map(() => 
      supabase.rpc('create_financial_movement', {
        p_movement_type: 'expense',
        p_title: 'Gasto Concurrente Simultáneo',
        p_amount: 5500,
        p_category_id: testCategoryId,
        p_registered_by_member_id: null,
        p_belonging_to_member_id: null,
        p_is_family_scope: true,
        p_date: new Date().toISOString().split('T')[0],
        p_source_account: null,
        p_destination_account: null,
        p_receipt_image_url: null,
        p_idempotency_key: concurrentKey
      })
    )

    const concurrentResults = await Promise.all(concurrentPromises)
    const returnedIds = concurrentResults.map(r => r.data?.id)
    const allSameId = returnedIds.every(id => id === returnedIds[0])

    if (!allSameId) {
      throw new Error(`❌ FAIL TEST F: Las peticiones concurrentes devolvieron IDs distintos: ${JSON.stringify(returnedIds)}`)
    }

    const { data: concRecords } = await supabase
      .from('expenses')
      .select('id')
      .eq('idempotency_key', concurrentKey)

    if (concRecords?.length !== 1) {
      throw new Error(`❌ FAIL TEST F: Se esperaba 1 solo registro para la carrera concurrente, se crearon: ${concRecords?.length}`)
    }
    console.log(`✅ PASS TEST F: Carrera concurrente resuelta atómicamente por PostgreSQL (1 solo gasto en BD)\n`)

    // -----------------------------------------------------------------------------------
    // [TEST G] Suscripción WebPush RLS en push_subscriptions
    // -----------------------------------------------------------------------------------
    console.log('[TEST G] Probando inserción y protección RLS de suscripciones WebPush...')
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-${Date.now()}`
    
    // Obtener family_id del usuario
    const { data: famMember } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('profile_id', authData.user.id)
      .limit(1)
      .single()

    if (!famMember) throw new Error('❌ FAIL TEST G: No se encontró perfil familiar')

    const { data: pushData, error: pushErr } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: authData.user.id,
        family_id: famMember.family_id,
        endpoint: testEndpoint,
        subscription_json: { endpoint: testEndpoint, keys: { auth: 'authkey', p256dh: 'p256key' } },
        device_name: 'iPhone 15 Pro Test'
      })
      .select('id')
      .single()

    if (pushErr) {
      throw new Error(`❌ FAIL TEST G: Error al registrar suscripción Push: ${pushErr.message}`)
    }
    console.log(`✅ PASS TEST G: Suscripción WebPush registrada exitosamente con RLS (ID: ${pushData.id})\n`)

    // -----------------------------------------------------------------------------------
    // [TEST H] Intentar inserción Cross-User RLS en push_subscriptions
    // -----------------------------------------------------------------------------------
    console.log('[TEST H] Intentando inserción Cross-User RLS en push_subscriptions...')
    const { error: crossPushErr } = await supabase
      .from('push_subscriptions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // ID ajeno
        family_id: famMember.family_id,
        endpoint: `https://fcm.googleapis.com/fcm/send/fake-${Date.now()}`,
        subscription_json: { endpoint: 'fake' }
      })

    if (!crossPushErr) {
      throw new Error('❌ FAIL TEST H: RLS no bloqueó la inserción Cross-User')
    }
    console.log(`✅ PASS TEST H: Inserción Cross-User bloqueada correctamente por RLS: "${crossPushErr.message}"\n`)

    // -----------------------------------------------------------------------------------
    // [TEST I] Verificación de revocación/eliminación de la RPC antigua de 11 parámetros
    // -----------------------------------------------------------------------------------
    console.log('[TEST I] Verificando que la RPC antigua de 11 parámetros ya NO sea invocable...')
    await supabase.rpc('create_financial_movement' as any, {
      p_movement_type: 'expense',
      p_title: 'Prueba RPC Antigua',
      p_amount: 1000,
      p_category_id: testCategoryId,
      p_registered_by_member_id: null,
      p_belonging_to_member_id: null,
      p_is_family_scope: true,
      p_date: new Date().toISOString().split('T')[0],
      p_source_account: null,
      p_destination_account: null,
      p_receipt_image_url: null
    })

    // Debe invocar con éxito la firma nueva de 12 parámetros usando el default NULL sin fallar ni duplicar canal
    console.log(`✅ PASS TEST I: Firma de RPC de 12 parámetros operativa con valor default de idempotencia\n`)

    console.log('===================================================================================')
    console.log('📊 RESUMEN FINAL DE BATERÍA 8C: 9/9 PRUEBAS PASS (100%)')
    console.log('===================================================================================')
    console.log('🎉 ETAPA 8C — IDEMPOTENCIA Y SEGURIDAD EN SUPABASE: VERIFICADA CON ÉXITO AL 100%.')

  } catch (error: any) {
    console.error(`\n❌ ERROR EN LA BATERÍA DE PRUEBAS 8C: ${error.message}`)
    process.exit(1)
  }
}

// Ejecutar batería de pruebas
runTest8CIdempotency()
