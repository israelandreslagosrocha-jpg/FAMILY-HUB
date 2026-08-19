import { supabase } from './supabaseClient'

export interface TestReportItem {
  id: string
  title: string
  objective: string
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL' | 'WARN'
}

/**
 * Suite Completa de Pruebas de Seguridad para ETAPA 2C
 * Ejecuta los TEST 2C.1 a 2C.7 desde la perspectiva de cliente con JWT de usuario autenticado.
 */
export async function runFullTestBattery(email: string, password: string): Promise<TestReportItem[]> {
  const report: TestReportItem[] = []

  console.log(`=== BATERÍA COMPLETA DE PRUEBAS ETAPA 2C CON USUARIO: ${email} ===\n`)

  // 1. Iniciar sesión
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({ email, password })
  if (authErr || !authData.user) {
    report.push({
      id: 'TEST 2C.2',
      title: 'Autenticación de Usuario A',
      objective: 'Obtener JWT autenticado para el cliente Supabase',
      action: `signInWithPassword para ${email}`,
      expected: 'Sesión autenticada (role: authenticated) con token JWT',
      actual: `Error: ${authErr?.message || 'Sin sesión'}`,
      status: 'FAIL'
    })
    return report
  }

  report.push({
    id: 'TEST 2C.2',
    title: 'Autenticación de Usuario A',
    objective: 'Obtener JWT autenticado para el cliente Supabase',
    action: `signInWithPassword para ${email}`,
    expected: 'Sesión autenticada (role: authenticated)',
    actual: `Sesión iniciada con éxito (User ID: ${authData.user.id})`,
    status: 'PASS'
  })

  // 2. TEST 2C.3: Onboarding Inicial
  const { data: familyId, error: onboardErr } = await supabase.rpc('onboard_first_family', {
    p_family_name: 'Familia Lagos Test',
    p_member_name: 'Israel',
    p_avatar_id: 'avatar-01',
    p_color: '#3b82f6',
    p_role: 'Papá'
  })

  if (onboardErr) {
    if (onboardErr.message.includes('ya pertenece a una familia activa')) {
      report.push({
        id: 'TEST 2C.3',
        title: 'Onboarding Atómico Inicial',
        objective: 'Crear atómicamente profile, family, family_member y categorías predeterminadas',
        action: 'Invocación a public.onboard_first_family(...)',
        expected: 'Creación de estructura o rechazo idempotente si ya fue creada',
        actual: `Idempotente activo: ${onboardErr.message}`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 2C.3',
        title: 'Onboarding Atómico Inicial',
        objective: 'Crear estructura atómica inicial de la familia',
        action: 'Invocación a public.onboard_first_family(...)',
        expected: 'Creación exitosa de familia y asignación de ID',
        actual: `Error: ${onboardErr.message}`,
        status: 'FAIL'
      })
    }
  } else {
    report.push({
      id: 'TEST 2C.3',
      title: 'Onboarding Atómico Inicial',
      objective: 'Crear atómicamente profile, family, family_member y categorías predeterminadas',
      action: 'Invocación a public.onboard_first_family(...)',
      expected: 'Family ID uuid retornado y tablas sembradas',
      actual: `Éxito: Creada Familia ID ${familyId}`,
      status: 'PASS'
    })
  }

  // 3. TEST 2C.3b: Reintento / Advisory Lock / Idempotencia
  const { error: retryErr } = await supabase.rpc('onboard_first_family', {
    p_family_name: 'Segunda Familia Falsa',
    p_member_name: 'Israel Reintento',
    p_avatar_id: 'avatar-01',
    p_color: '#3b82f6',
    p_role: 'Papá'
  })

  if (retryErr && retryErr.message.includes('ya pertenece a una familia activa')) {
    report.push({
      id: 'TEST 2C.3b',
      title: 'Idempotencia y Advisory Lock de Onboarding',
      objective: 'Impedir que un usuario con familia activa genere múltiples familias',
      action: 'Segunda invocación a public.onboard_first_family(...) con la misma cuenta',
      expected: 'Excepción "El usuario ya pertenece a una familia activa"',
      actual: `Rechazado correctamente: "${retryErr.message}"`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 2C.3b',
      title: 'Idempotencia de Onboarding',
      objective: 'Impedir múltiples familias por usuario',
      action: 'Segunda invocación RPC',
      expected: 'Excepción de bloqueo',
      actual: retryErr ? retryErr.message : 'Permitió crear segunda familia (FAIL)',
      status: 'FAIL'
    })
  }

  // Obtenemos los datos del miembro e ID de familia
  const { data: myMember } = await supabase.from('family_members').select('*').limit(1).single()
  const activeMemberId = myMember?.id
  const activeFamilyId = myMember?.family_id

  // Obtenemos una categoría válida
  const { data: myCategory } = await supabase.from('categories').select('*').limit(1).single()
  const activeCategoryId = myCategory?.id

  if (!activeMemberId || !activeFamilyId || !activeCategoryId) {
    report.push({
      id: 'TEST 2C.4',
      title: 'Pruebas RLS CRUD Intra-Familia',
      objective: 'Obtener IDs de contexto familiar para pruebas CRUD',
      action: 'Consulta a family_members y categories',
      expected: 'Miembro y categorías activas encontradas',
      actual: 'No se encontraron datos de miembros o categorías',
      status: 'FAIL'
    })
    return report
  }

  // 4. TEST 2C.4: Inserción y Modificación de Tarea (Validación de Status y completed_at Coherence)
  const { data: newTask, error: insertTaskErr } = await supabase.from('task_instances').insert({
    family_id: activeFamilyId,
    assigned_member_id: activeMemberId,
    created_by_member_id: activeMemberId,
    category_id: activeCategoryId,
    title: 'Tarea de Prueba 2C',
    due_date: new Date().toISOString(),
    priority: 'media',
    status: 'pending'
  }).select().single()

  if (insertTaskErr || !newTask) {
    report.push({
      id: 'TEST 2C.4-TaskInsert',
      title: 'Inserción de Tarea en Familia A',
      objective: 'Insertar una tarea válida perteneciendo a la propia familia',
      action: 'INSERT en task_instances',
      expected: 'Tarea creada con status = pending y completed_at = null',
      actual: `Error: ${insertTaskErr?.message}`,
      status: 'FAIL'
    })
  } else {
    report.push({
      id: 'TEST 2C.4-TaskInsert',
      title: 'Inserción de Tarea en Familia A',
      objective: 'Insertar una tarea válida perteneciendo a la propia familia',
      action: 'INSERT en task_instances',
      expected: 'Tarea creada con status = pending y completed_at = null',
      actual: `Creada ID ${newTask.id} | status: ${newTask.status} | completed_at: ${newTask.completed_at}`,
      status: 'PASS'
    })

    // 5. TEST 2C.7: Coherencia de status -> completed_at
    const { data: completedTask, error: updateTaskErr } = await supabase.from('task_instances').update({
      status: 'completed'
    }).eq('id', newTask.id).select().single()

    if (updateTaskErr || !completedTask) {
      report.push({
        id: 'TEST 2C.7-CoherenceComplete',
        title: 'Coherencia de completed_at al completar',
        objective: 'Asignar completed_at = now() automáticamente al pasar status a completed',
        action: 'UPDATE status = completed',
        expected: 'completed_at asignado automáticamente por trigger',
        actual: `Error: ${updateTaskErr?.message}`,
        status: 'FAIL'
      })
    } else {
      const hasCompletedAt = !!completedTask.completed_at
      report.push({
        id: 'TEST 2C.7-CoherenceComplete',
        title: 'Coherencia de completed_at al completar',
        objective: 'Asignar completed_at = now() automáticamente al pasar status a completed',
        action: 'UPDATE status = completed',
        expected: 'completed_at no nulo',
        actual: `status: ${completedTask.status} | completed_at: ${completedTask.completed_at}`,
        status: hasCompletedAt ? 'PASS' : 'FAIL'
      })

      // Probar reseteo a NULL al pasar a pending de nuevo
      const { data: pendingAgain } = await supabase.from('task_instances').update({
        status: 'pending'
      }).eq('id', newTask.id).select().single()

      const isResetNull = pendingAgain?.completed_at === null
      report.push({
        id: 'TEST 2C.7-CoherenceReset',
        title: 'Coherencia de completed_at al desmarcar',
        objective: 'Resetear completed_at = null al regresar status a pending',
        action: 'UPDATE status = pending',
        expected: 'completed_at = null',
        actual: `status: ${pendingAgain?.status} | completed_at: ${pendingAgain?.completed_at}`,
        status: isResetNull ? 'PASS' : 'FAIL'
      })
    }
  }

  // 6. TEST 2C.6: Bloqueo de Inserción Directa a history_logs y Verificación de Auditoría
  const { error: directLogErr } = await supabase.from('history_logs').insert({
    family_id: activeFamilyId,
    action_type: 'hacked',
    entity_type: 'task',
    entity_id: activeMemberId,
    human_log_text: 'Registro falso del cliente'
  } as any)

  if (directLogErr) {
    report.push({
      id: 'TEST 2C.6-DirectHistoryBlock',
      title: 'Protección de Inserción Directa en Bitácora',
      objective: 'Impedir que el cliente inserte registros de auditoría directamente en history_logs',
      action: 'INSERT directo en history_logs desde cliente',
      expected: 'Rechazo por falta de política RLS INSERT',
      actual: `Rechazado correctamente: ${directLogErr.message} (Código ${directLogErr.code})`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 2C.6-DirectHistoryBlock',
      title: 'Protección de Inserción Directa en Bitácora',
      objective: 'Impedir inserción directa desde cliente',
      action: 'INSERT directo en history_logs',
      expected: 'Rechazado por RLS',
      actual: 'Permitió inserción directa desde cliente (FAIL)',
      status: 'FAIL'
    })
  }

  // Verificación de Registros Creados por Trigger en history_logs
  const { data: logs } = await supabase.from('history_logs').select('*')
  report.push({
    id: 'TEST 2C.6-TriggerAuditLog',
    title: 'Generación Automática de Auditoría por Trigger',
    objective: 'Verificar que el trigger de BD registró automáticamente las acciones en history_logs',
    action: 'SELECT * FROM history_logs',
    expected: 'Registros de auditoría creados automáticamente',
    actual: `${logs?.length || 0} registros capturados por triggers`,
    status: (logs && logs.length > 0) ? 'PASS' : 'FAIL'
  })

  // 7. TEST 2C.5: Verificación Ataques Cross-Family (Usando IDs Falsos de otra familia)
  const fakeFamilyId = '00000000-0000-0000-0000-000000000000'
  const fakeMemberId = '00000000-0000-0000-0000-000000000001'

  const { error: crossFamilyErr } = await supabase.from('task_instances').insert({
    family_id: activeFamilyId, // Mía
    assigned_member_id: fakeMemberId, // Miembro de otra familia
    created_by_member_id: activeMemberId,
    category_id: activeCategoryId,
    title: 'Ataque Cross Family',
    due_date: new Date().toISOString(),
    status: 'pending'
  })

  if (crossFamilyErr) {
    report.push({
      id: 'TEST 2C.5-CrossFamilyAttack',
      title: 'Protección y Validación Cross-Family en RLS',
      objective: 'Impedir asignar miembros o categorías pertenecientes a otra familia',
      action: 'INSERT en task_instances usando member_id de otra familia',
      expected: 'Rechazado por comprobación WITH CHECK de RLS / FK Cross-Family',
      actual: `Bloqueado correctamente: ${crossFamilyErr.message}`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 2C.5-CrossFamilyAttack',
      title: 'Protección Cross-Family',
      objective: 'Bloquear referencias cruzadas entre familias',
      action: 'INSERT con assigned_member_id de otra familia',
      expected: 'Bloqueado por RLS WITH CHECK',
      actual: 'Permitió asociar un miembro ajeno (FAIL)',
      status: 'FAIL'
    })
  }

  return report
}
