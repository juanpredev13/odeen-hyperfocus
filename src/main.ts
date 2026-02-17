import { createApp } from 'vue'
import router from '@/router'
import App from '@/app/App.vue'

import '@/styles/variables.css'
import '@/styles/reset.css'
import '@/styles/base.css'

createApp(App).use(router).mount('#app')
