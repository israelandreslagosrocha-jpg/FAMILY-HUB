<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  type: 'events' | 'tasks' | 'responsibilities' | 'finance'
}>()

const isDismissed = ref(false)
</script>

<template>
  <div v-if="!isDismissed" class="educational-hint-card glass-card">
    <div class="hint-header">
      <div class="hint-title-group">
        <span class="hint-icon">💡</span>
        <h4 class="hint-title">
          <template v-if="type === 'events'">Guía de Compromisos Familiares</template>
          <template v-else-if="type === 'tasks'">Guía de Tareas del Hogar</template>
          <template v-else-if="type === 'responsibilities'">Guía de Responsabilidades</template>
          <template v-else>Guía de Finanzas Familiares</template>
        </h4>
      </div>
      <button class="dismiss-btn" @click="isDismissed = true" title="Ocultar consejos">✕</button>
    </div>

    <div class="hint-body">
      <p class="hint-intro" v-if="type === 'events'">
        Usa los <strong>Compromisos Familiares</strong> para coordinar eventos, citas y actividades en el Calendario asignando a los participantes:
      </p>
      <p class="hint-intro" v-else-if="type === 'tasks'">
        Las <strong>Tareas</strong> son pendientes cotidianos asignables a cada miembro de la familia (Israel, Naty, Santi o Vicente):
      </p>
      <p class="hint-intro" v-else-if="type === 'responsibilities'">
        Las <strong>Responsabilidades</strong> definen hábitos y roles habituales de cada integrante en el hogar:
      </p>
      <p class="hint-intro" v-else>
        Registra <strong>Gastos, Ingresos y Boletas con OCR</strong> para mantener las finanzas del hogar transparentes y organizadas:
      </p>

      <ul class="hint-examples-list">
        <template v-if="type === 'events'">
          <li>📌 <strong>Escuela / Colegio:</strong> Reunión de apoderados de Santi, actos escolares, entrega de notas.</li>
          <li>📌 <strong>Salud & Médico:</strong> Cita médica al dentista de Vicente, control pediátrico.</li>
          <li>📌 <strong>Celebraciones & Paseos:</strong> Cumpleaños familiar, paseo al parque los fines de semana.</li>
        </template>
        <template v-else-if="type === 'tasks'">
          <li>✅ <strong>Compras indispensables:</strong> Comprar remedios en la farmacia, pan o verduras del día.</li>
          <li>✅ <strong>Cuentas y Servicios:</strong> Pagar cuenta de luz (Enel), agua o internet antes de la fecha límite.</li>
          <li>✅ <strong>Hogar y Reparaciones:</strong> Reparar llave del baño, llevar el vehículo a mantención.</li>
        </template>
        <template v-else-if="type === 'responsibilities'">
          <li>🛠️ <strong>Israel:</strong> Mantenimiento técnico del hogar, pago de servicios principales y coordinación.</li>
          <li>🛠️ <strong>Naty:</strong> Gestión de compras de supermercado, menú semanal y coordinación médica.</li>
          <li>🛠️ <strong>Santi & Vicente:</strong> Sacar la basura los martes y jueves, ordenar juguetes y dormitorios.</li>
        </template>
        <template v-else>
          <li>💵 <strong>Gastos Familiares:</strong> Supermercado mensual (Jumbo/Lider), servicios básicos, matrículas.</li>
          <li>💵 <strong>Gastos Personales:</strong> Ropa individual, transporte (Carga Bip/Combustible), colaciones.</li>
          <li>🧾 <strong>Captura OCR:</strong> Fotografía cualquier boleta para extraer el total y registrar el gasto en 3 segundos.</li>
        </template>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.educational-hint-card {
  padding: 1.1rem;
  border-radius: 18px;
  background: rgba(59, 130, 246, 0.05);
  border: 1px solid rgba(59, 130, 246, 0.2);
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

@media (prefers-color-scheme: dark) {
  .educational-hint-card {
    background: rgba(30, 41, 59, 0.5);
    border-color: rgba(59, 130, 246, 0.25);
  }
}

.hint-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hint-title-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hint-icon {
  font-size: 1.2rem;
}

.hint-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #3b82f6;
  margin: 0;
}

.dismiss-btn {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 6px;
}

.dismiss-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-primary);
}

.hint-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hint-intro {
  font-size: 0.86rem;
  color: var(--text-secondary);
  margin: 0;

}

.hint-examples-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding-left: 0.5rem;
  list-style: none;
  margin: 0;
}

.hint-examples-list li {
  font-size: 0.83rem;
  color: var(--text-primary);
  line-height: 1.4;
}
</style>
