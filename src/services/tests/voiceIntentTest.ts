/**
 * Batería de Pruebas Automatizadas para el Motor de Voz e Intenciones de FAMILY-HUB
 * Ejecutable vía tsx / node para verificar los 10 casos de negocio obligatorios.
 */

import { voiceIntentResolver } from '../voice/voiceIntentResolver'
import { voiceNormalizer } from '../voice/voiceNormalizer'
import type { FamilyMember } from '../../types'

const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  {
    id: 'm-1',
    name: 'Israel',
    role: 'Papá / Jefe de Hogar',
    color: '#3b82f6',
    avatarId: 'avatar_father_1',
    isActive: true
  },
  {
    id: 'm-2',
    name: 'Naty',
    role: 'Mamá',
    color: '#ec4899',
    avatarId: 'avatar_mother_1',
    isActive: true
  },
  {
    id: 'm-3',
    name: 'Santi',
    role: 'Hijo mayor',
    color: '#10b981',
    avatarId: 'avatar_son_1',
    isActive: true
  }
]

async function runVoiceIntentTests() {
  console.log('🎙️ === INICIANDO BATERÍA DE PRUEBAS DE VOZ & INTENCIONES (10 CASOS) ===\n')
  let passedCount = 0
  let failedCount = 0

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`)
      passedCount++
    } else {
      console.error(`  ❌ [FAIL] ${testName} - ${details || ''}`)
      failedCount++
    }
  }

  // CASO 1: Tarea cotidiana
  const t1 = voiceIntentResolver.resolve('Comprar pan mañana', MOCK_FAMILY_MEMBERS)
  assert(t1.intent === 'task.create', 'Caso 1: "Comprar pan mañana" -> task.create', `Intent obtenido: ${t1.intent}`)
  assert(t1.entities.title?.toLowerCase().includes('pan') ?? false, 'Caso 1: Título contiene "pan"')

  // CASO 2: Evento de calendario con hora
  const t2 = voiceIntentResolver.resolve('El viernes tenemos reunión del colegio a las siete', MOCK_FAMILY_MEMBERS)
  assert(t2.intent === 'calendar.event.create', 'Caso 2: "Tenemos reunión el viernes a las siete" -> calendar.event.create')
  assert(t2.entities.time === '19:00', 'Caso 2: Hora resuelta a las 19:00', `Hora obtenida: ${t2.entities.time}`)

  // CASO 3: Gasto financiero con categoría
  const t3 = voiceIntentResolver.resolve('Pagué 48 mil de luz', MOCK_FAMILY_MEMBERS)
  assert(t3.intent === 'finance.expense.create', 'Caso 3: "Pagué 48 mil de luz" -> finance.expense.create')
  assert(t3.entities.amount === 48000, 'Caso 3: Monto resuelto a $48.000 CLP', `Monto obtenido: ${t3.entities.amount}`)
  assert(t3.entities.categoryName === 'Servicios y Cuentas', 'Caso 3: Categoría mapeada a "Servicios y Cuentas"')

  // CASO 4: Modismo chileno "lucas"
  const t4Norm = voiceNormalizer.extractAmount('gasté 48 lucas en el supermercado')
  assert(t4Norm === 48000, 'Caso 4: "48 lucas" -> 48000 CLP', `Monto obtenido: ${t4Norm}`)

  const t4Norm2 = voiceNormalizer.extractAmount('100 lucas')
  assert(t4Norm2 === 100000, 'Caso 4.1: "100 lucas" -> 100000 CLP', `Monto obtenido: ${t4Norm2}`)

  // CASO 5: Transferencia bancaria
  const t5 = voiceIntentResolver.resolve('Transferí 100 mil de BancoEstado a efectivo', MOCK_FAMILY_MEMBERS)
  assert(t5.intent === 'finance.transfer.create', 'Caso 5: "Transferí 100 mil de BancoEstado a efectivo" -> finance.transfer.create')
  assert(t5.entities.amount === 100000, 'Caso 5: Monto de transferencia $100.000 CLP')
  assert(t5.entities.sourceAccount === 'BancoEstado', 'Caso 5: Cuenta origen BancoEstado')
  assert(t5.entities.destinationAccount === 'Efectivo / Billetera', 'Caso 5: Cuenta destino Efectivo / Billetera')

  // CASO 6: Responsabilidad recurrente asignada a miembro familiar
  const t6 = voiceIntentResolver.resolve('Papá sacará la basura todos los lunes', MOCK_FAMILY_MEMBERS)
  assert(t6.intent === 'responsibility.create', 'Caso 6: "Papá sacará la basura todos los lunes" -> responsibility.create')
  assert(t6.entities.memberId === 'm-1', 'Caso 6: Miembro asignado Israel (Papá)', `MemberId: ${t6.entities.memberId}`)
  assert(t6.entities.recurrence === 'weekly', 'Caso 6: Recurrencia semanal')

  // CASO 7: Recordatorio en días relativos
  const t7 = voiceIntentResolver.resolve('Recuérdame pagar el colegio en cinco días', MOCK_FAMILY_MEMBERS)
  assert(t7.intent === 'reminder.create', 'Caso 7: "Recuérdame pagar el colegio en cinco días" -> reminder.create')
  assert(t7.entities.targetType === 'expense', 'Caso 7: Target inferred como expense')

  // CASO 8: Recordatorio con antelación relativa a evento
  const t8 = voiceIntentResolver.resolve('Recuérdame el dentista media hora antes', MOCK_FAMILY_MEMBERS)
  assert(t8.intent === 'reminder.create', 'Caso 8: "Recuérdame el dentista media hora antes" -> reminder.create')
  assert(t8.entities.relativeOffsetMinutes === -30, 'Caso 8: Offset de 30 minutos antes (-30)')

  // CASO 9: Comando incompleto / ambiguo
  const t9 = voiceIntentResolver.resolve('Comprar cosas', MOCK_FAMILY_MEMBERS)
  assert(t9.intent === 'ambiguous', 'Caso 9: "Comprar cosas" -> ambiguous')
  assert(t9.requiresDisambiguation === true, 'Caso 9: Exige desambiguación')

  // CASO 10: Comando desconocido
  const t10 = voiceIntentResolver.resolve('No sé qué decir', MOCK_FAMILY_MEMBERS)
  assert(t10.intent === 'unknown', 'Caso 10: "No sé qué decir" -> unknown')

  console.log(`\n📊 RESULTADOS BATERÍA DE VOZ: ${passedCount} PASADOS / ${failedCount} FALLIDOS`)
  if (failedCount > 0) {
    process.exit(1)
  }
}

runVoiceIntentTests().catch(console.error)
