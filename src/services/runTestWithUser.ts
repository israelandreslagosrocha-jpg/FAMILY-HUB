import { runFullTestBattery } from './runTest2C_FullSuite'

async function runTestForUser() {
  const email = 'israel@familyhub.cl'
  const password = 'P#2?hqfa2WK5Y$M'

  console.log(`🚀 Iniciando Batería Completa de Pruebas ETAPA 2C para: ${email}...\n`)

  const results = await runFullTestBattery(email, password)
  
  console.log('=== RESUMEN DE RESULTADOS DE PRUEBAS ETAPA 2C ===\n')
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

runTestForUser()
