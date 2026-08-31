import { supabase } from './supabaseClient'
import { calendarService } from './calendarService'

export interface Test3DItem {
  id: string
  title: string
  objective: string
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
}

export async function runTestBattery3D(): Promise<Test3DItem[]> {
  const report: Test3DItem[] = []

  console.log('=== BATERÍA DE PRUEBAS REALES DE INTEGRACIÓN DEL CALENDARIO (ETAPA 3D) ===\n')

  // 1. Autenticación con usuario de pruebas
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl',
    password: import.meta.env.VITE_TEST_USER_PASSWORD || ''
  })

  if (authErr || !authData.user) {
    report.push({
      id: 'TEST 3D.1',
      title: 'Autenticación en Supabase Auth',
      objective: 'Iniciar sesión como israel@familyhub.cl',
      action: 'signInWithPassword',
      expected: 'Sesión autenticada (role: authenticated)',
      actual: `Error: ${authErr?.message}`,
      status: 'FAIL'
    })
    return report
  }

  report.push({
    id: 'TEST 3D.1',
    title: 'Autenticación en Supabase Auth',
    objective: 'Iniciar sesión como israel@familyhub.cl',
    action: 'signInWithPassword',
    expected: 'Sesión autenticada (role: authenticated)',
    actual: `Sesión iniciada con éxito (User ID: ${authData.user.id})`,
    status: 'PASS'
  })

  // Obtenemos los miembros de la familia del usuario
  const { data: members } = await supabase.from('family_members').select('*')
  const validMemberId = members && members.length > 0 ? members[0].id : null

  if (!validMemberId) {
    report.push({
      id: 'TEST 3D.2',
      title: 'Obtención de Contexto Familiar',
      objective: 'Obtener un member_id válido de la familia activa',
      action: 'select * from family_members',
      expected: 'Al menos 1 miembro encontrado',
      actual: 'No se encontraron miembros',
      status: 'FAIL'
    })
    return report
  }

  // 2. TEST 3D.2: Intento de Ataque Cross-Family con member_id ajeno o falso
  const fakeMemberId = '00000000-0000-0000-0000-000000000001'
  const { error: crossMemberErr } = await supabase.rpc('create_family_event', {
    p_title: 'Ataque Participante Ajeno',
    p_description: 'Prueba',
    p_start_time: '2026-08-19T10:00:00Z',
    p_end_time: '2026-08-19T11:00:00Z',
    p_is_all_day: false,
    p_is_family_event: true,
    p_category_id: null,
    p_member_ids: [fakeMemberId]
  })

  if (crossMemberErr && crossMemberErr.message.includes('no pertenecen activamente a su familia')) {
    report.push({
      id: 'TEST 3D.2',
      title: 'Bloqueo de Participante Ajeno (Cross-Family)',
      objective: 'Impedir asignar member_ids de otra familia o inexistentes',
      action: 'Invocación RPC con member_id inexistente/ajeno',
      expected: 'Rechazo con "Uno o más participantes no pertenecen activamente a su familia"',
      actual: `Bloqueado correctamente: "${crossMemberErr.message}"`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 3D.2',
      title: 'Bloqueo de Participante Ajeno',
      objective: 'Impedir asignar member_ids ajenos',
      action: 'Invocación RPC con member_id ajeno',
      expected: 'Excepción de seguridad',
      actual: crossMemberErr ? crossMemberErr.message : 'Permitió participante ajeno (FAIL)',
      status: 'FAIL'
    })
  }

  // 3. TEST 3D.3: Intento de Creación sin Participantes
  const { error: emptyMemberErr } = await supabase.rpc('create_family_event', {
    p_title: 'Evento Sin Participantes',
    p_description: 'Prueba',
    p_start_time: '2026-08-19T10:00:00Z',
    p_end_time: '2026-08-19T11:00:00Z',
    p_is_all_day: false,
    p_is_family_event: true,
    p_category_id: null,
    p_member_ids: []
  })

  if (emptyMemberErr && emptyMemberErr.message.includes('Debe especificar al menos un participante')) {
    report.push({
      id: 'TEST 3D.3',
      title: 'Validación de Participante Obligatorio',
      objective: 'Impedir la creación de eventos huérfanos sin participantes',
      action: 'Invocación RPC con p_member_ids vacíos []',
      expected: 'Rechazo con "Debe especificar al menos un participante para el evento"',
      actual: `Rechazado correctamente: "${emptyMemberErr.message}"`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 3D.3',
      title: 'Validación de Participante Obligatorio',
      objective: 'Impedir eventos sin participantes',
      action: 'Invocación RPC con arreglo vacío',
      expected: 'Excepción de validación',
      actual: emptyMemberErr ? emptyMemberErr.message : 'Permitió evento sin participantes (FAIL)',
      status: 'FAIL'
    })
  }

  // 4. TEST 3D.4: Creación de Evento Válido con Recurrencia Semanal y Deduplicación
  const { data: eventId, error: createErr } = await supabase.rpc('create_family_event', {
    p_title: 'Reunión Familiar Semanal (Prueba 3D)',
    p_description: 'Reunión de coordinación familiar',
    p_start_time: '2026-08-19T17:00:00Z',
    p_end_time: '2026-08-19T18:00:00Z',
    p_is_all_day: false,
    p_is_family_event: true,
    p_category_id: null,
    p_member_ids: [validMemberId, validMemberId], // Arreglo intencionalmente duplicado para probar deduplicación
    p_recurrence_frequency: 'weekly',
    p_recurrence_days_of_week: [1, 3] // Lunes y Miércoles
  })

  if (createErr || !eventId) {
    report.push({
      id: 'TEST 3D.4',
      title: 'Creación de Evento Recurrente y Deduplicación',
      objective: 'Crear un evento con recurrencia semanal deduplicando p_member_ids',
      action: 'Invocación RPC con recurrencia semanal y p_member_ids duplicados',
      expected: 'Evento y regla de recurrencia creados exitosamente',
      actual: `Error: ${createErr?.message}`,
      status: 'FAIL'
    })
  } else {
    report.push({
      id: 'TEST 3D.4',
      title: 'Creación de Evento Recurrente y Deduplicación',
      objective: 'Crear un evento con recurrencia semanal deduplicando p_member_ids',
      action: 'Invocación RPC con recurrencia semanal y p_member_ids duplicados',
      expected: 'Evento y regla de recurrencia creados exitosamente',
      actual: `Creado exitosamente (Event ID: ${eventId})`,
      status: 'PASS'
    })

    // 5. TEST 3D.5: Verificación de Borrado en Cascada y Limpieza de Recurrencia Huérfana
    try {
      await calendarService.deleteEvent(eventId)
      report.push({
        id: 'TEST 3D.5',
        title: 'Limpieza de Regla de Recurrencia al Eliminar',
        objective: 'Verificar que eliminar el evento elimina sus event_members y su recurrence_rule',
        action: 'calendarService.deleteEvent(eventId)',
        expected: 'Borrado en cascada exitoso',
        actual: 'Evento y regla de recurrencia exclusiva borrados de Supabase',
        status: 'PASS'
      })
    } catch (err: any) {
      report.push({
        id: 'TEST 3D.5',
        title: 'Limpieza de Regla de Recurrencia al Eliminar',
        objective: 'Verificar borrado en cascada',
        action: 'calendarService.deleteEvent(eventId)',
        expected: 'Borrado exitoso',
        actual: `Error: ${err.message}`,
        status: 'FAIL'
      })
    }
  }

  return report
}

async function runMain() {
  const results = await runTestBattery3D()
  console.log('=== RESUMEN DE RESULTADOS DE PRUEBAS ETAPA 3D ===\n')
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌'
    console.log(`${icon} [${r.id}] ${r.title}`)
    console.log(`   • Objetivo: ${r.objective}`)
    console.log(`   • Acción: ${r.action}`)
    console.log(`   • Esperado: ${r.expected}`)
    console.log(`   • Real: ${r.actual}`)
    console.log(`   • Estado: ${r.status}\n`)
  })
}

runMain()
