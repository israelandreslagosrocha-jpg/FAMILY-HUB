import { receiptParser } from '../receiptParser'

async function runReceiptParserTests() {
  console.log('🧾 === INICIANDO BATERÍA DE PRUEBAS DE PARSER OCR DE BOLETAS CHILENAS ===\n')

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

  // CASO 1: Boleta Real de la Foto del Usuario (Supermercado Bella Vista con "Res 80 de 2014" en el pie)
  const textRealUserReceipt = `
    R.U.T: 7619637-0
    BOLETA ELECTRÓNICA N° 563.750,00
    SII - TEMUCO
    GABRIEL SEPÚLVEDA SUAZO
    Bella Vista
    Giro: SUPERMERCADO
    Direccion: MANUEL BALMACEDA 1052
    Fono: 992219973
    Correo: magalynavarromunoz@gmail.com
    Fecha Emisión: 31-08-2026 01:10:51 PM
    Medio Pago: TARJETA
    Vendedor:
    Cantidad Descripción Precio Unit. Total
    1 SALCHICHA SUREÑA 1.400 1,400
    LA PREFERIDA
    1 PAN CORRIENTE 1.150 1,150
    1 PALTA 1.280 1,280
    1 PEPINO 590 590
    10 HUEVO 300 3,000
    1 KIWI 1.230 1,230
    TOTALES
    Paga con: 0
    Vuelto: 0
    Total: $8.650
    Esta boleta tiene un IVA de : $1.381
    Res 80 de 2014 Verifique Documento
  `

  const rUser = receiptParser.parseReceiptText(textRealUserReceipt, 96)
  assert(rUser.merchantName === 'Supermercado Bella Vista', 'Caso Real: Comercio detectado Supermercado Bella Vista')
  assert(rUser.date === '2026-08-31', `Caso Real: Fecha extraída 2026-08-31 (obtenido: ${rUser.date})`)
  assert(rUser.totalAmount === 8650, `Caso Real: Monto total exacto $8.650 (obtenido: ${rUser.totalAmount})`)
  assert(rUser.taxAmount === 1381, `Caso Real: IVA exacto $1.381 (obtenido: ${rUser.taxAmount})`)
  assert(rUser.items ? rUser.items.length === 6 : false, `Caso Real: Exactamente 6 productos leídos (obtenidos: ${rUser.items?.length})`)
  
  // Verificar que NO se incluyó "Res 80" ni "Paga con" como producto
  const hasRes80 = rUser.items?.some(i => i.description.includes('RES 80') || i.description.includes('2014'))
  assert(!hasRes80, 'Caso Real: "Res 80 de 2014" fue EXCLUIDO correctamente y NO se tomó como producto')

  // Verificar productos individuales
  assert(rUser.items ? rUser.items.some(i => i.description.includes('SALCHICHA') && i.totalPrice === 1400) : false, 'Caso Real: Salchicha Sureña La Preferida $1.400')
  assert(rUser.items ? rUser.items.some(i => i.description.includes('PAN CORRIENTE') && i.totalPrice === 1150) : false, 'Caso Real: Pan Corriente $1.150')
  assert(rUser.items ? rUser.items.some(i => i.description.includes('PALTA') && i.totalPrice === 1280) : false, 'Caso Real: Palta $1.280')
  assert(rUser.items ? rUser.items.some(i => i.description.includes('PEPINO') && i.totalPrice === 590) : false, 'Caso Real: Pepino $590')
  assert(rUser.items ? rUser.items.some(i => i.description.includes('HUEVO') && i.quantity === 10 && i.totalPrice === 3000) : false, 'Caso Real: 10 Huevos x $300 = $3.000')
  assert(rUser.items ? rUser.items.some(i => i.description.includes('KIWI') && i.totalPrice === 1230) : false, 'Caso Real: Kiwi $1.230')

  // Reconciliación matemática
  const sumItems = rUser.items?.reduce((acc, curr) => acc + curr.totalPrice, 0) || 0
  assert(sumItems === rUser.totalAmount, `Caso Real: Suma matemática de productos ($${sumItems}) coincide exactamente con el Total ($${rUser.totalAmount})`)

  // CASO 2: Boleta Supermercado Lider / Walmart Chile
  const textLider = `
    HIPER LIDER
    WALMART CHILE S.A.
    R.U.T.: 76.134.941-4
    FECHA EMISION: 25-08-2026

    ARROZ TUCAPEL G2 1KG $1.490
    ACEITE MARAVILLA 900CC 1.990
    LECHE ENTERA COLUN 1L $ 1.150
    2 YOGURT BATIDO 1.000

    TOTAL A PAGAR $5.630
    REDCOMPRA DEBITO $5.630
  `

  const r2 = receiptParser.parseReceiptText(textLider, 90)
  assert(r2.merchantName === 'Supermercado Lider', 'Caso 2: Comercio detectado Lider')
  assert(r2.totalAmount === 5630, `Caso 2: Total $5.630 extraído (obtenido: ${r2.totalAmount})`)
  assert(r2.items ? r2.items.length >= 4 : false, `Caso 2: Al menos 4 productos detectados (obtenidos: ${r2.items?.length})`)
  assert(r2.items ? r2.items.some(i => i.description.includes('ARROZ') && i.totalPrice === 1490) : false, 'Caso 2: ARROZ TUCAPEL $1.490')

  // CASO 3: Boleta de Farmacia Cruz Verde
  const textFarmacia = `
    FARMACIAS CRUZ VERDE S.A.
    RUT: 96.534.220-4
    FECHA: 28/08/2026

    1 PARACETAMOL 500MG 2.490 2.490
    1 IBUPROFENO 400MG 3.190 3.190

    TOTAL: $ 5.680
  `

  const r3 = receiptParser.parseReceiptText(textFarmacia, 92)
  assert(r3.merchantName === 'Farmacia Cruz Verde', 'Caso 3: Comercio detectado Cruz Verde')
  assert(r3.totalAmount === 5680, `Caso 3: Monto total $5.680`)
  assert(r3.items ? r3.items.length === 2 : false, `Caso 3: 2 medicamentos extraídos`)

  // CASO 4: Boleta Nueva 1 del Usuario (Azúcar La Patrona 1KG, $1.100, IVA $176)
  const textBoleta1 = `
    ue BOLETA ELECTRÓNICA N° 564,424.00 |
    {i 7 SIETEMUCO — ——
    Ad GABRIEL SEPÚLVEDA SUAZO
    Giro: SUPERMERCADO
    Direccion: MANUEL BALMACEDA 1052
    Fecha Emisión: 04-09-2026 10:16:00 AM
    Medio Pago: TARJETA
    Vendedor:
    CantidadDescripción Precio Unit. Total
    1 AZÚCAR LAPATRONA 1.100 1,100
    1KG
    EET ThoTAles
    Paga con: 1.100
    Vuelto: 0
    Total: $1.100
    Esta boleta tiene un IVA de : $176
    Res 80 de 2014 Verifique Documento
  `

  const r4 = receiptParser.parseReceiptText(textBoleta1, 95)
  assert(r4.merchantName === 'Supermercado Bella Vista', 'Caso 4: Comercio detectado Supermercado Bella Vista')
  assert(r4.totalAmount === 1100, `Caso 4: Total exacto $1.100 (obtenido: ${r4.totalAmount})`)
  assert(r4.taxAmount === 176, `Caso 4: IVA exacto $176 (obtenido: ${r4.taxAmount})`)
  assert(r4.items?.length === 1, `Caso 4: Exactamente 1 producto extraído (obtenidos: ${r4.items?.length})`)
  assert(r4.items ? r4.items[0].description.includes('AZÚCAR') && r4.items[0].description.includes('1KG') : false, 'Caso 4: Glosa extendida combinada con 1KG')
  assert(r4.items ? r4.items[0].totalPrice === 1100 : false, 'Caso 4: Precio del azúcar $1.100')

  // CASO 5: Boleta Nueva 2 del Usuario (7 productos, Total $10.130, IVA $1.617)
  const textBoleta2 = `
    GABRIEL SEPÚLVEDA SUAZO
    Bella Vista
    Vendedor:
    CantidadDescripción Precio Unit. Total
    ox Rad 1 MANDARINAS 1.570 1,570
    ER 1 CREMADE LECHE 1.490 1,490
    NESTLE 200ML
    1 MANJAR SOPROLE 2.250 2,250
    500GR
    1 BONOBONBLANCO 650 650
    40 GR
    2 NIKOLO 430 860
    1 OBLEACHOCMAN 300 300
    COSTA
    1 QUESOS MITADES 3010 3010
    TOTALES
    Paga con: 0
    Vuelto: 0
    Total: $10.130
    Esta boleta tiene un IVA de : $1.617
    Res 80 de 2014 Verifique Documento
  `

  const r5 = receiptParser.parseReceiptText(textBoleta2, 95)
  assert(r5.merchantName === 'Supermercado Bella Vista', 'Caso 5: Comercio detectado Supermercado Bella Vista')
  assert(r5.totalAmount === 10130, `Caso 5: Total exacto $10.130 (obtenido: ${r5.totalAmount})`)
  assert(r5.taxAmount === 1617, `Caso 5: IVA exacto $1.617 (obtenido: ${r5.taxAmount})`)
  assert(r5.items?.length === 7, `Caso 5: Exactamente 7 productos leídos (obtenidos: ${r5.items?.length})`)
  
  // Reconciliación matemática exacta
  const sum5 = r5.items?.reduce((acc, curr) => acc + curr.totalPrice, 0) || 0
  assert(sum5 === 10130, `Caso 5: Suma de los 7 productos ($${sum5}) coincide al 100% con el Total $10.130`)

  // Verificar producto con cantidad > 1 (2 Nikolo x $430 = $860)
  const nikolo = r5.items?.find(i => i.description.includes('NIKOLO'))
  assert(nikolo ? nikolo.quantity === 2 && nikolo.unitPrice === 430 && nikolo.totalPrice === 860 : false, 'Caso 5: 2 Nikolos x $430 = $860')

  // Glosas extendidas con marcas y pesos
  assert(r5.items ? r5.items.some(i => i.description.includes('CREMA') && i.description.includes('200ML')) : false, 'Caso 5: Crema con 200ML')
  assert(r5.items ? r5.items.some(i => i.description.includes('MANJAR') && i.description.includes('500GR')) : false, 'Caso 5: Manjar con 500GR')
  assert(r5.items ? r5.items.some(i => i.description.includes('BONOBON') && i.description.includes('40 GR')) : false, 'Caso 5: Bon o Bon con 40 GR')
  assert(r5.items ? r5.items.some(i => i.description.includes('CHOCMAN') && i.description.includes('COSTA')) : false, 'Caso 5: Chocman con Costa')

  console.log(`\n📊 RESULTADOS BATERÍA DE PARSER: ${passed} PASADOS / ${total - passed} FALLIDOS`)

  if (passed === total) {
    console.log('🎉 100% PASS: El motor de parseo y auto-relleno de productos funciona con precisión milimétrica.')
  }
}

runReceiptParserTests()
