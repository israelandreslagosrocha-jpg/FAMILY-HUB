---
name: apple-bento-grid
description: Pautas de diseño visual estilo Apple Bento Grid (basado en hubeiqiao/apple-bento-grid) para layouts asimétricos, glassmorphism, micro-animaciones y tarjetas dinámicas en FAMILY-HUB.
---

# 🍱 Apple Bento Grid Design System — FAMILY-HUB

Esta habilidad implementa los patrones visuales y de interacción oficial del repositorio **`hubeiqiao/apple-bento-grid`** adaptados a **FAMILY-HUB**.

---

## 🎨 1. Atributos Visuales Clave (Apple Bento Grid)

### A. Tipografía de Gran Impacto (Heavy Bold Weights)
- Títulos principales con peso ultra-bold (`font-weight: 800` / `900`) e interlineado ajustado (`line-height: 1.1`, `letter-spacing: -0.03em`).
- Números estadísticos de alto contraste en colores eléctricos (Cyan `#00e5ff`, Verde Esmeralda `#00e676`, Púrpura `#a855f7`, Azul `#3b82f6`).

### B. Proporciones y Disposición Bento Box
- Grilla asimétrica modular con `gap: 1.25rem`.
- Tarjeta Hero (Ancha), Tarjetas Estadísticas con rellenos en gradiente vivo (`linear-gradient(135deg, #0284c7, #06b6d4)` / `#059669, #10b981`), Tarjetas de Etiquetas Pills y Banner de Frase Motivacional al pie.
- Radios de borde continuamente curvos / Squircular (`border-radius: 28px`).

---

## 📐 2. Utilidades CSS Apple Bento Grid (`main.css`)

```css
/* Grilla Principal Bento */
.bento-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 1.25rem;
}

@media (min-width: 900px) {
  .bento-grid {
    grid-template-columns: repeat(12, 1fr);
  }
}

/* Tarjeta Base Bento */
.bento-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 28px;
  padding: 1.5rem;
  box-shadow: var(--shadow-card);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s;
}

.bento-card:hover {
  transform: translateY(-3px) scale(1.01);
  border-color: rgba(59, 130, 246, 0.4);
}

/* Tarjeta Accent Cyan / Teal (Destacada) */
.bento-card-cyan {
  background: linear-gradient(135deg, #0284c7 0%, #06b6d4 50%, #22d3ee 100%);
  color: #ffffff;
  border: none;
}

/* Tarjeta Accent Green / Emerald (Destacada) */
.bento-card-green {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
  color: #ffffff;
  border: none;
}

/* Banner de Lema / Frase Familiar al Pie */
.bento-quote-banner {
  grid-column: span 12;
  background: #0f172a;
  border-radius: 24px;
  padding: 1.25rem 2rem;
  text-align: center;
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
}

.bento-quote-banner .highlight-green { color: #10b981; }
.bento-quote-banner .highlight-blue { color: #38bdf8; }
```
