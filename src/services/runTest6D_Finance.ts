import { supabase } from './supabaseClient'
import { financeService } from './financeService'

export interface Test6DItem {
  id: string
  title: string
  objective: string
  action: string
  expected: string
  actual: string
  status: 'PASS' | 'FAIL'
}

export async function runTestBattery6D(): Promise<Test6DItem[]> {
  const report: Test6DItem[] = []

  console.log('=== BATERÍA DE PRUEBAS REALES DE INTEGRACIÓN FINANCIERA (ETAPA 6D) ===\n')

  // 1. TEST 6D.1: Autenticación en Supabase Auth
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: import.meta.env.VITE_TEST_USER_EMAIL || 'israel@familyhub.cl',
    password: import.meta.env.VITE_TEST_USER_PASSWORD || ''
  })

  if (authErr || !authData.user) {
    report.push({
      id: 'TEST 6D.1',
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
    id: 'TEST 6D.1',
    title: 'Autenticación en Supabase Auth',
    objective: 'Iniciar sesión como israel@familyhub.cl',
    action: 'signInWithPassword',
    expected: 'Sesión autenticada (role: authenticated)',
    actual: `Sesión iniciada con éxito (User ID: ${authData.user.id})`,
    status: 'PASS'
  })

  // Obtener contexto familiar y categoría
  const { data: members } = await supabase.from('family_members').select('*')
  const familyId = members && members.length > 0 ? members[0].family_id : null
  const memberId = members && members.length > 0 ? members[0].id : null

  const { data: categories } = await supabase.from('categories').select('*').limit(1)
  const categoryId = categories && categories.length > 0 ? categories[0].id : null

  if (!familyId || !memberId || !categoryId) {
    report.push({
      id: 'TEST 6D.2',
      title: 'Obtención de Contexto Familiar',
      objective: 'Obtener un family_id, member_id y category_id válidos',
      action: 'select from family_members & categories',
      expected: 'Entidades encontradas',
      actual: 'No se encontraron datos básicos',
      status: 'FAIL'
    })
    return report
  }

  // 2. TEST 6D.2: Aislamiento del Canal Único de Escritura (Bloqueo REST Directo)
  const { error: restErr } = await supabase.from('expenses').insert({
    family_id: familyId,
    category_id: categoryId,
    registered_by_member_id: memberId,
    title: 'Gasto REST Ilegal 6D',
    amount: 1000,
    currency: 'CLP',
    date: '2026-08-19'
  })

  if (restErr) {
    report.push({
      id: 'TEST 6D.2',
      title: 'Aislamiento del Canal Único de Escritura (Bloqueo REST Directo)',
      objective: 'Impedir inserciones REST directas en expenses sin pasar por la RPC',
      action: 'supabase.from("expenses").insert(...)',
      expected: 'Permisos denegados (permission denied)',
      actual: `Bloqueado correctamente: "${restErr.message}"`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 6D.2',
      title: 'Aislamiento del Canal Único de Escritura',
      objective: 'Impedir inserción REST directa',
      action: 'insert',
      expected: 'Inserción denegada',
      actual: 'Se permitió inserción REST directa ilegal (FAIL)',
      status: 'FAIL'
    })
  }

  // 3. TEST 6D.3: Registro de Gasto Familiar vía RPC
  let expenseId: string | null = null
  try {
    expenseId = await financeService.createMovement({
      movementType: 'expense',
      title: 'Supermercado 6D Prueba',
      amount: 45000,
      categoryId: categoryId,
      registeredByMemberId: memberId,
      isFamilyScope: true
    })

    const { data: expRow } = await supabase.from('expenses').select('*').eq('id', expenseId).single()
    if (expRow && expRow.is_family_expense === true && expRow.belonging_to_member_id === null) {
      report.push({
        id: 'TEST 6D.3',
        title: 'Registro de Gasto Familiar vía RPC',
        objective: 'Registrar gasto familiar y verificar belonging_to_member_id = NULL',
        action: 'financeService.createMovement(expense, isFamilyScope: true)',
        expected: 'Gasto registrado, is_family_expense = true, belonging_to_member_id = null',
        actual: `Gasto ID ${expenseId} registrado con éxito con pertenencia nula`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 6D.3',
        title: 'Registro de Gasto Familiar vía RPC',
        objective: 'Verificar coherencia de gasto familiar',
        action: 'createMovement',
        expected: 'Gasto familiar guardado',
        actual: 'Pertenencia incoherente (FAIL)',
        status: 'FAIL'
      })
    }
  } catch (err: any) {
    report.push({
      id: 'TEST 6D.3',
      title: 'Registro de Gasto Familiar vía RPC',
      objective: 'Registrar gasto familiar',
      action: 'createMovement',
      expected: 'Registro exitoso',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 4. TEST 6D.4: Registro de Gasto Personal con Pertenencia
  let personalExpenseId: string | null = null
  try {
    personalExpenseId = await financeService.createMovement({
      movementType: 'expense',
      title: 'Ropa Personal 6D',
      amount: 28000,
      categoryId: categoryId,
      registeredByMemberId: memberId,
      belongingToMemberId: memberId,
      isFamilyScope: false
    })

    const { data: pExpRow } = await supabase.from('expenses').select('*').eq('id', personalExpenseId).single()
    if (pExpRow && pExpRow.is_family_expense === false && pExpRow.belonging_to_member_id === memberId) {
      report.push({
        id: 'TEST 6D.4',
        title: 'Registro de Gasto Personal con Pertenencia',
        objective: 'Verificar diferenciación entre registered_by y belonging_to en gasto personal',
        action: 'financeService.createMovement(expense, isFamilyScope: false)',
        expected: 'is_family_expense = false y belonging_to_member_id asignado',
        actual: `Gasto Personal ID ${personalExpenseId} guardado con belonging_to: ${memberId}`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 6D.4',
        title: 'Registro de Gasto Personal con Pertenencia',
        objective: 'Verificar pertenencia personal',
        action: 'createMovement',
        expected: 'Gasto personal guardado',
        actual: 'Campos incoherentes (FAIL)',
        status: 'FAIL'
      })
    }
  } catch (err: any) {
    report.push({
      id: 'TEST 6D.4',
      title: 'Registro de Gasto Personal',
      objective: 'Registrar gasto personal',
      action: 'createMovement',
      expected: 'Registro exitoso',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 5. TEST 6D.5: Registro de Ingreso del Hogar
  let incomeId: string | null = null
  try {
    incomeId = await financeService.createMovement({
      movementType: 'income',
      title: 'Honorarios Proyecto 6D',
      amount: 250000,
      categoryId: categoryId,
      registeredByMemberId: memberId,
      isFamilyScope: true
    })

    report.push({
      id: 'TEST 6D.5',
      title: 'Registro de Ingreso del Hogar',
      objective: 'Registrar un movimiento de tipo ingreso',
      action: 'financeService.createMovement(income)',
      expected: 'Ingreso guardado exitosamente en public.incomes',
      actual: `Ingreso ID ${incomeId} guardado con éxito`,
      status: 'PASS'
    })
  } catch (err: any) {
    report.push({
      id: 'TEST 6D.5',
      title: 'Registro de Ingreso del Hogar',
      objective: 'Registrar ingreso',
      action: 'createMovement',
      expected: 'Registro exitoso',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 6. TEST 6D.6: Registro de Transferencia Neutra entre Cuentas
  let transferId: string | null = null
  try {
    transferId = await financeService.createMovement({
      movementType: 'transfer',
      title: 'Transferencia Banco a Efectivo 6D',
      amount: 50000,
      registeredByMemberId: memberId,
      isFamilyScope: true,
      sourceAccount: 'Cuenta Banco Estado',
      destinationAccount: 'Caja Efectivo Casa'
    })

    const { data: trfRow } = await supabase.from('transfers').select('*').eq('id', transferId).single()
    if (trfRow && trfRow.source_account === 'Cuenta Banco Estado' && trfRow.destination_account === 'Caja Efectivo Casa') {
      report.push({
        id: 'TEST 6D.6',
        title: 'Registro de Transferencia Neutra entre Cuentas',
        objective: 'Verificar registro de transferencia neutra sin afectar ingresos ni gastos',
        action: 'financeService.createMovement(transfer)',
        expected: 'Transferencia guardada en public.transfers',
        actual: `Transferencia ID ${transferId} guardada (${trfRow.source_account} -> ${trfRow.destination_account})`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 6D.6',
        title: 'Registro de Transferencia Neutra',
        objective: 'Verificar transferencia',
        action: 'createMovement',
        expected: 'Guardado en transfers',
        actual: 'No se encontró la transferencia (FAIL)',
        status: 'FAIL'
      })
    }
  } catch (err: any) {
    report.push({
      id: 'TEST 6D.6',
      title: 'Registro de Transferencia Neutra',
      objective: 'Registrar transferencia',
      action: 'createMovement',
      expected: 'Registro exitoso',
      actual: `Error: ${err.message}`,
      status: 'FAIL'
    })
  }

  // 7. TEST 6D.7: Rechazo de Categoría Cross-Family o Inexistente
  try {
    await financeService.createMovement({
      movementType: 'expense',
      title: 'Gasto Falso Categoría Inexistente',
      amount: 10000,
      categoryId: '00000000-0000-0000-0000-000000000099',
      registeredByMemberId: memberId,
      isFamilyScope: true
    })

    report.push({
      id: 'TEST 6D.7',
      title: 'Rechazo de Categoría Cross-Family/Inexistente',
      objective: 'Rechazar categorías no pertenecientes a la familia',
      action: 'createMovement con categoría inválida',
      expected: 'Lanzar excepción y rechazar inserción',
      actual: 'Permitió categoría inválida (FAIL)',
      status: 'FAIL'
    })
  } catch (err: any) {
    if (err.message.includes('categoría especificada no pertenece')) {
      report.push({
        id: 'TEST 6D.7',
        title: 'Rechazo de Categoría Cross-Family/Inexistente',
        objective: 'Rechazar categorías no pertenecientes a la familia',
        action: 'createMovement con categoría inválida',
        expected: 'Excepción: La categoría especificada no pertenece a su familia',
        actual: `Rechazado correctamente: "${err.message}"`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 6D.7',
        title: 'Rechazo de Categoría Cross-Family/Inexistente',
        objective: 'Rechazar categoría inválida',
        action: 'createMovement',
        expected: 'Excepción de categoría',
        actual: `Excepción distinta: ${err.message}`,
        status: 'FAIL'
      })
    }
  }

  // 8. TEST 6D.8: Rechazo de Monto Inválido (<= 0)
  try {
    await financeService.createMovement({
      movementType: 'expense',
      title: 'Gasto Monto Cero',
      amount: 0,
      categoryId: categoryId,
      registeredByMemberId: memberId,
      isFamilyScope: true
    })

    report.push({
      id: 'TEST 6D.8',
      title: 'Rechazo de Monto Inválido (<= 0)',
      objective: 'Impedir registro de movimientos con monto cero o negativo',
      action: 'createMovement con amount: 0',
      expected: 'Lanzar excepción de monto estrictamente positivo',
      actual: 'Permitió monto 0 (FAIL)',
      status: 'FAIL'
    })
  } catch (err: any) {
    if (err.message.includes('mayor a 0')) {
      report.push({
        id: 'TEST 6D.8',
        title: 'Rechazo de Monto Inválido (<= 0)',
        objective: 'Impedir registro de movimientos con monto <= 0',
        action: 'createMovement con amount: 0',
        expected: 'Excepción: El monto del movimiento debe ser estrictamente mayor a 0',
        actual: `Rechazado correctamente: "${err.message}"`,
        status: 'PASS'
      })
    } else {
      report.push({
        id: 'TEST 6D.8',
        title: 'Rechazo de Monto Inválido',
        objective: 'Rechazar monto <= 0',
        action: 'createMovement',
        expected: 'Excepción de monto',
        actual: `Excepción distinta: ${err.message}`,
        status: 'FAIL'
      })
    }
  }

  // 9. TEST 6D.9: Auditoría Inalterable en history_logs
  const { data: logs } = await supabase
    .from('history_logs')
    .select('*')
    .in('action_type', ['expense_registered', 'income_registered', 'transfer_registered'])
    .order('created_at', { ascending: false })
    .limit(4)

  if (logs && logs.length >= 4) {
    report.push({
      id: 'TEST 6D.9',
      title: 'Auditoría Inalterable en history_logs',
      objective: 'Verificar generación automática de logs para expense, income y transfer',
      action: 'select from history_logs where action_type in (expense_registered, income_registered, transfer_registered)',
      expected: 'Al menos 4 registros de auditoría inalterables generados',
      actual: `Registros capturados con éxito (${logs.length} logs verificados en BD)`,
      status: 'PASS'
    })
  } else {
    report.push({
      id: 'TEST 6D.9',
      title: 'Auditoría Inalterable en history_logs',
      objective: 'Verificar registros de auditoría',
      action: 'select history_logs',
      expected: 'Registros presentes en history_logs',
      actual: `Solo se encontraron ${logs?.length || 0} registros`,
      status: 'FAIL'
    })
  }

  return report
}

async function runMain() {
  const results = await runTestBattery6D()
  console.log('=== RESUMEN DE RESULTADOS DE PRUEBAS ETAPA 6D ===\n')
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
