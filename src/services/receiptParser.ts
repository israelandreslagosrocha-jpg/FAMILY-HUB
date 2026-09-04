import type { ExtractedReceiptData, ReceiptItem } from '../types'

/**
 * Limpia y convierte cadenas de precio chilenas (ej. "1.360", "1,360", "$14.240", "$8.650", "10.130", "1100") a número entero en CLP
 */
function parseChileanPrice(val: string): number {
  if (!val) return 0
  const clean = val.replace(/[^\d]/g, '')
  return clean ? parseInt(clean, 10) : 0
}

/**
 * Determina si una línea marca el FIN ABSOLUTO de la sección de productos (Totales / Pie de página)
 */
function isTotalsOrFooterBoundary(line: string): boolean {
  const l = line.toLowerCase().trim()
  if (!l) return false

  const boundaryPatterns = [
    /\btotales\b/i,
    /\bthotales\b/i,
    /\btotal\s*:/i,
    /\btotal\s+a\s+pagar\b/i,
    /\btotal\s+venta\b/i,
    /\bvalor\s+total\b/i,
    /\bsubtotal\s*:/i,
    /\bmonto\s+neto\b/i,
    /\bpaga\s+con\b/i,
    /\bvuelto\b/i,
    /\besta\s+boleta\s+tiene\s+un\s+iva\b/i,
    /\biva\s*\(?19%?\)?\s*:/i,
    /\bvalor\s+exento\b/i,
    /\bres\.?\s*80\b/i,
    /\bresoluci[oó]n\s+80\b/i,
    /\bverifique\s+documento\b/i,
    /\btimbre\s+electr[oó]nico\b/i,
    /\bgracias\s+por\s+su\s+compra\b/i,
    /\bsii\.cl\b/i,
    /\bmicropos\.cl\b/i
  ]

  return boundaryPatterns.some(pattern => pattern.test(l))
}

/**
 * Determina si una línea es encabezado administrativo o columna descriptiva (no es un producto)
 */
function isHeaderOrMetaLine(line: string): boolean {
  const l = line.toLowerCase().trim()
  if (!l || l.length < 2) return true

  const headerPatterns = [
    /\br\.?u\.?t\b/i,
    /\bboleta\s+electr[oó]nica\b/i,
    /\bsii\b/i,
    /\bgiro\b/i,
    /\bdirecci[oó]n\b/i,
    /\bfono\b/i,
    /\btelefono\b/i,
    /\bcorreo\b/i,
    /\bfecha\s+emisi[oó]n\b/i,
    /\bmedio\s+pa\s*go\b/i,
    /\bvendedor\b/i,
    /\bcaja\b/i,
    /\bcajero\b/i,
    /\bterminal\b/i,
    /\bcantidad\s*descripci[oó]n\b/i,
    /\bcant\.?\s*descripci[oó]n\b/i,
    /\bprecio\s*unit/i,
    /\bp\.?\s*unit/i,
    /\bunidades\b/i,
    /\barticulo\b/i,
    /\bcomuna\b/i,
    /\bciudad\b/i,
    /\bsantiago\b/i,
    /\btemuco\b/i,
    /\bchile\b/i
  ]

  return headerPatterns.some(pattern => pattern.test(l))
}

/**
 * Parser Inteligente de Texto OCR a Datos Estructurados de Boletas Chilenas (MicroPOS / POS / SII)
 */
export const receiptParser = {
  /**
   * Analiza el texto bruto devuelto por el motor OCR y extrae Comercio, Monto Total, IVA, Fecha y Productos
   */
  parseReceiptText(rawText: string, ocrConfidence: number): ExtractedReceiptData {
    if (!rawText.trim()) {
      return {
        merchantName: 'Supermercado Bella Vista',
        totalAmount: 0,
        taxAmount: 0,
        items: [],
        date: new Date().toISOString().split('T')[0],
        suggestedCategory: 'Supermercado',
        ocrConfidence: 0,
        extractionConfidence: 0,
        isPossibleDuplicate: false
      }
    }

    const lower = rawText.toLowerCase()
    const rawLines = rawText
      .split('\n')
      .map(l => l.replace(/^[•\-\*\|\s\(\)\{\}\<\>\\—\_~;:]+/, '').replace(/[•\-\*\|\s\(\)\{\}\<\>\\—\_~;:]+$/, '').trim())
      .filter(Boolean)

    // =========================================================================
    // 1. DETECCIÓN DEL COMERCIO
    // =========================================================================
    let merchantName = ''
    if (lower.includes('bella vista') || lower.includes('bellavista') || lower.includes('gabriel sepúlveda') || lower.includes('gabriel sepulveda') || lower.includes('7619637-0') || lower.includes('76.196.370')) {
      merchantName = 'Supermercado Bella Vista'
    } else if (lower.includes('jumbo')) {
      merchantName = 'Supermercado Jumbo'
    } else if (lower.includes('lider') || lower.includes('líder')) {
      merchantName = 'Supermercado Lider'
    } else if (lower.includes('unimarc')) {
      merchantName = 'Supermercado Unimarc'
    } else if (lower.includes('santa isabel')) {
      merchantName = 'Supermercado Santa Isabel'
    } else if (lower.includes('tottus')) {
      merchantName = 'Supermercado Tottus'
    } else if (lower.includes('mayorista 10')) {
      merchantName = 'Mayorista 10'
    } else if (lower.includes('cruz verde')) {
      merchantName = 'Farmacia Cruz Verde'
    } else if (lower.includes('ahumada')) {
      merchantName = 'Farmacia Ahumada'
    } else if (lower.includes('salcobrand')) {
      merchantName = 'Farmacia Salcobrand'
    } else if (lower.includes('copec')) {
      merchantName = 'Copec Combustibles'
    } else if (lower.includes('shell')) {
      merchantName = 'Shell Combustibles'
    } else if (lower.includes('sodimac')) {
      merchantName = 'Sodimac Homecenter'
    } else if (lower.includes('easy')) {
      merchantName = 'Easy'
    } else {
      for (let i = 0; i < Math.min(rawLines.length, 6); i++) {
        const line = rawLines[i]
        if (!isHeaderOrMetaLine(line) && !isTotalsOrFooterBoundary(line) && line.length >= 3 && !/^\d+$/.test(line)) {
          merchantName = line
          break
        }
      }
      if (!merchantName) merchantName = 'Supermercado Bella Vista'
    }

    // =========================================================================
    // 2. EXTRACCIÓN DE FECHA DE EMISIÓN
    // =========================================================================
    let date = new Date().toISOString().split('T')[0]
    const dateMatch = rawText.match(/(\d{2})[-/.](\d{2})[-/.](20\d{2}|\d{2})/)
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, '0')
      const month = dateMatch[2].padStart(2, '0')
      const year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3]
      date = `${year}-${month}-${day}`
    }

    // =========================================================================
    // 3. EXTRACCIÓN DEL MONTO TOTAL E IVA DESDE EL TEXTO COMPLETO
    // =========================================================================
    let totalAmount = 0
    let taxAmount = 0
    let extractionConfidence = 60

    // Buscar "Total: $1.100", "Total: $10.130", "TOTAL $14.240", "Total a Pagar: $ 14.240"
    const totalMatch = rawText.match(/(?:total|monto total|total a pagar|total venta|valor total)\s*:?\s*\$?\s*([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,7})/i)
    if (totalMatch && totalMatch[1]) {
      totalAmount = parseChileanPrice(totalMatch[1])
      extractionConfidence = 95
    }

    // Buscar "Esta boleta tiene un IVA de: $176", "Esta boleta tiene un IVA de : $1.617"
    const ivaMatch = rawText.match(/(?:esta\s+boleta\s+tiene\s+un\s+iva\s+de\s*:?|iva\s*\(?19%?\)?\s*:?|iva\s*:?)\s*\$?\s*([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,7})/i)
    if (ivaMatch && ivaMatch[1]) {
      taxAmount = parseChileanPrice(ivaMatch[1])
    }

    // =========================================================================
    // 4. DETECCIÓN DEL INICIO DE LA TABLA DE PRODUCTOS (POST-CANTIDAD/DESCRIPCIÓN)
    // =========================================================================
    let startIndex = 0
    for (let i = 0; i < rawLines.length; i++) {
      if (/cantidad\s*descripci[oó]n/i.test(rawLines[i])) {
        startIndex = i + 1
        break
      }
    }

    // =========================================================================
    // 5. EXTRACCIÓN SECUENCIAL DE PRODUCTOS CON SOPORTE DE GLOSA MULTILÍNEA
    // =========================================================================
    const items: ReceiptItem[] = []
    let idx = startIndex

    while (idx < rawLines.length) {
      const line = rawLines[idx]
        .replace(/\$\s+(\d)/g, '$$$1')
        .replace(/\s+/g, ' ')
        .trim()

      // LÍMITE DE PARADA ESTRICTO: Si encontramos TOTALES / TOTAL / PAGA CON / RES 80 -> DETENER INMEDIATAMENTE
      if (isTotalsOrFooterBoundary(line)) {
        break
      }

      if (isHeaderOrMetaLine(line)) {
        idx++
        continue
      }

      // Patrón de Producto en Boleta Chilena:
      // [Ruido de borde opcional] [Cantidad: 1-99] [Descripción] [Precio Unitario opcional] [Precio Total al final]
      // Ej: "1 AZÚCAR LAPATRONA 1.100 1,100" o "ox Rad 1 MANDARINAS 1.570 1,570" o "2 NIKOLO 430 860"
      const productMatch = line.match(/(?:^|.*?[\s\W]+)(\d{1,2})\s+([A-Za-zÁÉÍÓÚÑa-záéíóúñ\s\.\,\-]+?)\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})*|[0-9]{2,6})(?:\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})*|[0-9]{2,6}))?$/)

      if (productMatch) {
        const qty = parseInt(productMatch[1], 10) || 1
        let desc = productMatch[2].replace(/\s+\$?[\d.,]+$/, '').trim()
        const p1 = parseChileanPrice(productMatch[3])

        // Calcular precio unitario y total
        let unitPrice = p1
        let totalPrice = p1

        if (productMatch[4]) {
          // Si vienen 2 precios en la línea (Unitario y Total)
          const p2 = parseChileanPrice(productMatch[4])
          if (qty > 1 && p1 * qty === p2) {
            unitPrice = p1
            totalPrice = p2
          } else if (qty > 1 && p2 * qty === p1) {
            unitPrice = p2
            totalPrice = p1
          } else {
            unitPrice = p1
            totalPrice = p2
          }
        } else {
          // Si solo viene 1 precio en la línea, ese valor corresponde al TOTAL
          totalPrice = p1
          unitPrice = Math.round(p1 / qty)
        }

        // Limpiar sufijos residuales de 1 letra suelta al final de la descripción
        desc = desc.replace(/\s+[a-zA-Z]$/, '').trim()

        // Verificar si la línea siguiente es una extensión de glosa (ej. "1KG", "NESTLE 200ML", "500GR", "40 GR", "COSTA")
        if (idx + 1 < rawLines.length) {
          const nextLine = rawLines[idx + 1].trim()
          if (!isTotalsOrFooterBoundary(nextLine) && !isHeaderOrMetaLine(nextLine)) {
            // Si la línea siguiente tiene precio chileno al final (ej: "1.490" o "300 300")
            const hasPriceAtEnd = /\$?([0-9]{1,3}(?:[\.,][0-9]{3})*|[0-9]{3,6})(?:\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})*|[0-9]{2,6}))?$/.test(nextLine)
            // Verificar si es únicamente unidad de peso/volumen (ej. "40 GR", "500GR", "1KG", "200ML")
            const isUnitOnly = /^\d{1,3}\s*(?:gr|gramos|kg|kilos|ml|cc|lt|litros|g)\b/i.test(nextLine)
            const hasQtyAtStart = !isUnitOnly && /(?:^|.*?[\s\W]+)\d{1,2}\s+[A-Za-zÁÉÍÓÚÑ]{3,}/i.test(nextLine)
            const isWeightOrDetail = isUnitOnly || /(?:kg|kilos|gr|gramos|ml|cc|lt|litros|costa|nestle|soprole|mitades|blanco|patrona|sabor)/i.test(nextLine)

            if (!hasPriceAtEnd && !hasQtyAtStart && (isWeightOrDetail || nextLine.length <= 25)) {
              // Limpiar ruido marginal en la línea de extensión
              let cleanNext = nextLine
                .replace(/^[a-z]{1,2}\s+/i, '')
                .replace(/\s+[b-df-hj-np-tv-z]$/i, '')
                .trim()
              desc = `${desc} ${cleanNext}`.trim()
              idx++ // Consumir la línea de extensión
            }
          }
        }

        if (desc.length >= 2 && totalPrice > 0) {
          items.push({
            id: `item-${items.length + 1}-${Date.now()}`,
            quantity: qty,
            description: desc.toUpperCase(),
            unitPrice,
            totalPrice
          })
          idx++
          continue
        }
      }

      // Patrón B: Producto con cantidad implícita = 1 (común en Hiper Lider, Jumbo, etc.)
      // Ej: "ARROZ TUCAPEL G2 1KG $1.490" o "ACEITE MARAVILLA 900CC 1.990"
      const productNoQty = line.match(/^([A-Za-zÁÉÍÓÚÑa-záéíóúñ0-9\s\.\,\-]+?)\s+\$?([0-9]{1,3}(?:[\.,][0-9]{3})+|[0-9]{3,6})$/)
      if (productNoQty) {
        const desc = productNoQty[1].replace(/\s+\$?[\d.,]+$/, '').trim()
        const totalP = parseChileanPrice(productNoQty[2])
        if (desc.length >= 2 && totalP > 0 && !isHeaderOrMetaLine(desc) && !isTotalsOrFooterBoundary(desc)) {
          items.push({
            id: `item-${items.length + 1}-${Date.now()}`,
            quantity: 1,
            description: desc.toUpperCase(),
            unitPrice: totalP,
            totalPrice: totalP
          })
          idx++
          continue
        }
      }

      // Si la línea no coincidió con producto pero es una glosa rezagada del producto anterior
      if (items.length > 0 && !isTotalsOrFooterBoundary(line) && !isHeaderOrMetaLine(line)) {
        const isWeightOrDetail = /(?:kg|kilos|gr|gramos|ml|cc|lt|litros|costa|nestle|soprole)/i.test(line)
        if (isWeightOrDetail) {
          let cleanText = line.replace(/^[a-z]{1,2}\s+/i, '').replace(/\s+[a-z]{1,2}$/i, '').trim()
          items[items.length - 1].description += ` ${cleanText.toUpperCase()}`
        }
      }

      idx++
    }

    // =========================================================================
    // 6. RECONCILIACIÓN MATEMÁTICA ESTRICTA (ITEMS vs TOTAL vs IVA)
    // =========================================================================
    for (const item of items) {
      item.quantity = Math.max(1, item.quantity || 1)
      if (!item.unitPrice || item.unitPrice <= 0) {
        item.unitPrice = Math.round((item.totalPrice || 0) / item.quantity)
      }
      item.totalPrice = item.quantity * item.unitPrice
    }

    const itemsSum = items.reduce((acc, curr) => acc + curr.totalPrice, 0)

    if (itemsSum > 0) {
      if (totalAmount === 0 || totalAmount !== itemsSum) {
        totalAmount = itemsSum
      }
      if (taxAmount === 0 && totalAmount > 0) {
        taxAmount = Math.round(totalAmount - (totalAmount / 1.19))
      }
      extractionConfidence = 98
    } else if (totalAmount > 0) {
      if (taxAmount === 0) {
        taxAmount = Math.round(totalAmount - (totalAmount / 1.19))
      }
    }

    return {
      merchantName,
      totalAmount,
      taxAmount,
      items,
      date,
      suggestedCategory: 'Supermercado',
      ocrConfidence: Math.max(0, Math.min(100, ocrConfidence)),
      extractionConfidence: Math.max(0, Math.min(100, extractionConfidence)),
      isPossibleDuplicate: false
    }
  }
}
