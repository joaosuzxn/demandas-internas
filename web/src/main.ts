import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { installHttpInterceptors } from './services/httpInterceptors'

const app = createApp(App)
const pinia = createPinia()

// A ordem importa: a guarda de rota usa a store, então o Pinia entra antes do router.
app.use(pinia)
installHttpInterceptors(router, pinia)
app.use(router)

app.mount('#app')
