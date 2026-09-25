import { createApp } from 'vue'
import router from '@/router'
import App from '@/app/App.vue'
import { initTheme } from '@/composables/useTheme'

import '@/styles/variables.css'
import '@/styles/reset.css'
import '@/styles/base.css'

// Apply the stored/OS theme before mount to avoid a flash of the wrong theme.
initTheme()

createApp(App).use(router).mount('#app')
