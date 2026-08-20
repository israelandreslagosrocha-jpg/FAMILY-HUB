---
name: apple-bento-grid
description: Pautas de diseño visual estilo Apple Bento Grid (basado en hubeiqiao/apple-bento-grid) para layouts asimétricos, glassmorphism, micro-animaciones y tarjetas dinámicas en FAMILY-HUB.
---

# 🍱 Apple Bento Grid Design System — FAMILY-HUB

Esta habilidad implementa los patrones visuales y de interacción inspirados en **Apple Bento Grid** (`hubeiqiao/apple-bento-grid`) adaptados al proyecto **FAMILY-HUB**.

---

## 🎨 1. Estructura de Grilla Bento (Bento Grid Proportions)

1. **Diseño Asimétrico y Modular**:
   - Layouts estructurados mediante `grid-template-columns: repeat(auto-fit, minmax(280px, 1fr))` o grillas asimétricas `repeat(12, 1fr)`.
   - Span modular: `grid-column: span 8` para widgets principales (ej. Finanzas o Calendario) y `grid-column: span 4` para widgets complementarios (ej. Tareas Pendientes, Historial de Auditoría).

2. **Esquinas Squircular (iOS / macOS Sonoma & Sequoia)**:
   - Contenedores principales: `border-radius: 24px` o `28px`.
   - Modales e Inputs: `border-radius: 14px` o `16px`.
   - Badges y Pills: `border-radius: 20px`.

---

## ✨ 2. Cristal Esmerilado Glassmorphic & Bordes Gradientes

```css
.bento-card {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 24px;
  box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.08);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

:root[data-theme="dark"] .bento-card {
  background: rgba(19, 27, 46, 0.75);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 12px 40px -10px rgba(0, 0, 0, 0.5);
}

.bento-card:hover {
  transform: translateY(-3px) scale(1.01);
  border-color: rgba(59, 130, 246, 0.4);
}
```

---

## 🚀 3. Principios de Interacción Táctil y Fluidez
- Transiciones `cubic-bezier(0.16, 1, 0.3, 1)` para un efecto orgánico estilo iOS.
- Indicadores semánticos de estado (Verde completado `#22c55e`, Amarillo pendiente `#eab308`, Rojo atención `#ef4444`, Azul informativo `#3b82f6`).
- Filtros por integrantes de la familia con chips conmutables y distintivo de color único por persona.
