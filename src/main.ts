import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { registerSW } from 'virtual:pwa-register'

// Registro y auto-actualización inmediata del Service Worker para PWA y Móviles
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('🔄 Actualizando Service Worker con la última versión...')
  },
  onOfflineReady() {
    console.log('📱 FAMILY-HUB cacheado para modo offline.')
  }
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

