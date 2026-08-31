/**
 * Batería de Pruebas Automatizadas para el Motor de Recordatorios y Alarmas
 */

import { ReminderService } from '../reminders/reminderService'

// Mock de IndexedDB en entorno Node/TS para ejecución de tests
class MockIDBDatabase {
  public store = new Map<string, any>()

  transaction() {
    return {
      objectStore: () => ({
        put: (item: any) => {
          this.store.set(item.id, JSON.parse(JSON.stringify(item)))
          const req: any = {}
          setTimeout(() => req.onsuccess && req.onsuccess({}), 0)
          return req
        },
        getAll: () => {
          const req: any = {}
          setTimeout(() => {
            req.result = Array.from(this.store.values())
            req.onsuccess && req.onsuccess({})
          }, 0)
          return req
        }
      })
    }
  }
}

async function runReminderTests() {
  console.log('🔔 === INICIANDO BATERÍA DE PRUEBAS DE RECORDATORIOS & ALARMAS ===\n')
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

  // Instanciar servicio con mock IDB para pruebas
  const service = new ReminderService()
  const mockDb = new MockIDBDatabase()
  ;(service as any).getDB = () => Promise.resolve(mockDb)

  // TEST 1: Programar Recordatorio Básico
  const r1 = await service.scheduleReminder({
    targetType: 'task',
    targetId: 'task-101',
    title: 'Comprar pan',
    scheduledAt: '2026-08-31T09:00:00-04:00',
    mode: 'notification',
    operationIdempotencyKey: 'op-key-1'
  })

  assert(r1.id.startsWith('rem-'), 'Test 1: ID de recordatorio generado correctamente')
  assert(r1.status === 'scheduled', 'Test 1: Estado inicial es "scheduled"')
  assert(r1.platform === 'web', 'Test 1: Plataforma detectada como "web"')

  // TEST 2: Idempotencia de Operación (evitar doble clic con misma operationIdempotencyKey)
  const r2 = await service.scheduleReminder({
    targetType: 'task',
    targetId: 'task-101',
    title: 'Comprar pan',
    scheduledAt: '2026-08-31T09:00:00-04:00',
    mode: 'notification',
    operationIdempotencyKey: 'op-key-1'
  })

  assert(r2.id === r1.id, 'Test 2: Doble clic con misma idempotencyKey retorna el mismo recordatorio')

  // TEST 3: Dos recordatorios legítimos a la misma hora pero con diferente operación
  const r3 = await service.scheduleReminder({
    targetType: 'event',
    targetId: 'event-202',
    title: 'Dentista de los niños',
    scheduledAt: '2026-08-31T09:00:00-04:00',
    mode: 'notification',
    operationIdempotencyKey: 'op-key-2'
  })

  assert(r3.id !== r1.id, 'Test 3: Dos recordatorios a la misma hora con diferente operationIdempotencyKey coexisten')
  
  const all = await service.getAllReminders()
  assert(all.length === 2, `Test 3.1: IndexedDB almacena ambos recordatorios (total: ${all.length})`)

  // TEST 4: Cancelar Recordatorio
  const cancelOk = await service.cancelReminder(r1.id)
  assert(cancelOk === true, 'Test 4: Cancelación retorna true')

  const updatedAll = await service.getAllReminders()
  const target = updatedAll.find(r => r.id === r1.id)
  assert(target?.status === 'cancelled', 'Test 4.1: Estado en IndexedDB actualizado a "cancelled"')

  // TEST 5: Consulta por Target
  const activeEventRem = await service.getReminderForTarget('event', 'event-202')
  assert(activeEventRem?.id === r3.id, 'Test 5: Consulta por target encuentra el recordatorio programado activo')

  const activeTaskRem = await service.getReminderForTarget('task', 'task-101')
  assert(activeTaskRem === undefined, 'Test 5.1: Target cancelado no se retorna como recordatorio activo')

  console.log(`\n📊 RESULTADOS BATERÍA RECORDATORIOS: ${passedCount} PASADOS / ${failedCount} FALLIDOS`)
  if (failedCount > 0) {
    process.exit(1)
  }
}

runReminderTests().catch(console.error)
