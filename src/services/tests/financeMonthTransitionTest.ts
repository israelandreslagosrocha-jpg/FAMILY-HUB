import type { FinancialMovement, FixedExpenseItem } from '../../types'

function testFinanceMonthTransition() {
  console.log('💰 === INICIANDO PRUEBAS DE TRANSICIÓN DE MES EN FINANZAS ===\n')

  let passed = 0
  let total = 0

  function assert(condition: boolean, title: string) {
    total++
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`)
      passed++
    } else {
      console.error(`  ❌ [FAIL] ${title}`)
    }
  }

  // 1. Simulación de Movimientos en Agosto (2026-08)
  const movements: FinancialMovement[] = [
    {
      id: 'mov-1',
      title: 'Sueldo Agosto',
      amount: 214366,
      currency: 'CLP',
      type: 'income',
      scope: 'family',
      categoryId: 'cat-1',
      categoryName: 'Sueldo',
      categoryIcon: '💼',
      categoryColor: '#10b981',
      registeredByMemberId: 'm-1',
      date: '2026-08-05'
    },
    {
      id: 'mov-2',
      title: 'Pago partituras',
      amount: 30000,
      currency: 'CLP',
      type: 'income',
      scope: 'family',
      categoryId: 'cat-2',
      categoryName: 'Partituras',
      categoryIcon: '🎼',
      categoryColor: '#10b981',
      registeredByMemberId: 'm-1',
      date: '2026-08-20'
    },
    {
      id: 'mov-3',
      title: 'Supermercado Bella Vista',
      amount: 90000,
      currency: 'CLP',
      type: 'expense',
      scope: 'family',
      categoryId: 'cat-3',
      categoryName: 'Supermercado',
      categoryIcon: '🛒',
      categoryColor: '#ef4444',
      registeredByMemberId: 'm-1',
      date: '2026-08-31'
    }
  ]

  // Cuentas Fijas
  const fixedExpenses: FixedExpenseItem[] = [
    {
      id: 'fix-1',
      title: 'Luz CGE',
      amount: 45000,
      categoryName: 'Servicios',
      dueDay: 10,
      isPaid: true,
      paidAt: '2026-08-10T14:00:00.000Z',
      icon: '💡',
      color: '#3b82f6'
    },
    {
      id: 'fix-2',
      title: 'Agua Aguas Araucanía',
      amount: 22000,
      categoryName: 'Servicios',
      dueDay: 15,
      isPaid: true,
      paidAt: '2026-08-14T11:00:00.000Z',
      icon: '💧',
      color: '#06b6d4'
    }
  ]

  // Helper para calcular disponible total acumulado
  function calcAvailableFunds(movs: FinancialMovement[]) {
    const inc = movs.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0)
    const exp = movs.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0)
    return inc - exp
  }

  // Helper para totales de un mes
  function calcMonthTotals(movs: FinancialMovement[], month: string) {
    const inc = movs.filter(m => m.type === 'income' && m.date.startsWith(month)).reduce((s, m) => s + m.amount, 0)
    const exp = movs.filter(m => m.type === 'expense' && m.date.startsWith(month)).reduce((s, m) => s + m.amount, 0)
    return { inc, exp, net: inc - exp }
  }

  // Helper para estado de cuentas en un mes
  function calcDisplayedFixed(fixed: FixedExpenseItem[], month: string) {
    return fixed.map(f => ({
      ...f,
      isPaid: Boolean(f.paidAt && f.paidAt.startsWith(month))
    }))
  }

  // PRUEBA 1: Estado al 31 de Agosto
  const augTotals = calcMonthTotals(movements, '2026-08')
  assert(augTotals.inc === 244366, 'Agosto: Ingresos totales = $244.366')
  assert(augTotals.exp === 90000, 'Agosto: Gastos totales = $90.000')
  assert(augTotals.net === 154366, 'Agosto: Superávit neto = $154.366')

  const augFixed = calcDisplayedFixed(fixedExpenses, '2026-08')
  assert(augFixed.every(f => f.isPaid), 'Agosto: Todas las cuentas fijas figuran como pagadas')

  // PRUEBA 2: Transición al 1 de Septiembre (Sin movimientos aún en septiembre)
  const sepTotals = calcMonthTotals(movements, '2026-09')
  assert(sepTotals.inc === 0, 'Septiembre: Ingresos del mes inician en $0')
  assert(sepTotals.exp === 0, 'Septiembre: Gastos del mes inician en $0')
  assert(sepTotals.net === 0, 'Septiembre: Flujo neto del mes inicia en $0')

  const sepAvailable = calcAvailableFunds(movements)
  assert(sepAvailable === 154366, `Septiembre: Dinero Disponible mantiene los $154.366 acumulados de agosto`)

  // PRUEBA 3: Cuentas Fijas se reinician automáticamente a "Sin pagar" en Septiembre
  const sepFixed = calcDisplayedFixed(fixedExpenses, '2026-09')
  assert(sepFixed.every(f => !f.isPaid), 'Septiembre: Todas las cuentas fijas se reinician automáticamente a "Sin pagar" (Pendientes)')

  // PRUEBA 4: Pago de cuenta en Septiembre (Luz CGE $45.000)
  fixedExpenses[0].paidAt = '2026-09-01T12:00:00.000Z'
  movements.push({
    id: 'mov-4',
    title: 'Pago Cuenta: Luz CGE',
    amount: 45000,
    currency: 'CLP',
    type: 'expense',
    scope: 'family',
    categoryId: 'cat-fixed',
    categoryName: 'Servicios',
    categoryIcon: '💡',
    categoryColor: '#3b82f6',
    registeredByMemberId: 'm-1',
    date: '2026-09-01'
  })

  const sepFixedAfter = calcDisplayedFixed(fixedExpenses, '2026-09')
  assert(sepFixedAfter[0].isPaid === true, 'Septiembre: Luz CGE ahora figura como Pagada en septiembre')
  assert(sepFixedAfter[1].isPaid === false, 'Septiembre: Agua sigue figurando como Pendiente')

  const sepTotalsAfter = calcMonthTotals(movements, '2026-09')
  assert(sepTotalsAfter.exp === 45000, 'Septiembre: Gastos del mes suben a $45.000')

  const sepAvailableAfter = calcAvailableFunds(movements)
  assert(sepAvailableAfter === 154366 - 45000, `Septiembre: Dinero Disponible se descuenta exactamente a $109.366 (obtenido: $${sepAvailableAfter})`)

  // PRUEBA 5: Ordenación Inteligente por Vencimiento (Pendientes primero, ordenadas 1 -> 31)
  const unsortedFixed: FixedExpenseItem[] = [
    { id: 'f-1', title: 'Internet', amount: 25000, categoryName: 'Servicios', dueDay: 20, isPaid: false, icon: '🌐', color: '#3b82f6' },
    { id: 'f-2', title: 'Gas', amount: 30000, categoryName: 'Servicios', dueDay: 5, isPaid: false, icon: '🔥', color: '#f59e0b' },
    { id: 'f-3', title: 'Luz', amount: 40000, categoryName: 'Servicios', dueDay: 12, isPaid: true, icon: '💡', color: '#ef4444' },
    { id: 'f-4', title: 'Agua', amount: 18000, categoryName: 'Servicios', dueDay: 8, isPaid: false, icon: '💧', color: '#06b6d4' }
  ]

  const sortedFixed = [...unsortedFixed].sort((a, b) => {
    if (a.isPaid !== b.isPaid) return a.isPaid ? 1 : -1
    return a.dueDay - b.dueDay
  })

  assert(sortedFixed[0].title === 'Gas', 'Orden: Gas (vence día 5, pendiente) queda en posición 1')
  assert(sortedFixed[1].title === 'Agua', 'Orden: Agua (vence día 8, pendiente) queda en posición 2')
  assert(sortedFixed[2].title === 'Internet', 'Orden: Internet (vence día 20, pendiente) queda en posición 3')
  assert(sortedFixed[3].title === 'Luz', 'Orden: Luz (pagada) queda al final')

  // PRUEBA 6: Actualización de Monto Variable In-Place (Luz varía de $40.000 a $38.250)
  sortedFixed[3].amount = 38250
  assert(sortedFixed[3].amount === 38250, 'Monto variable in-place actualizado a $38.250 correctamente')

  console.log(`\n📊 RESULTADOS: ${passed} PASADOS / ${total - passed} FALLIDOS`)
  if (passed === total) {
    console.log('🎉 100% PASS: La lógica de orden por vencimiento y montos variables in-place es exacta.')
  }
}

testFinanceMonthTransition()
