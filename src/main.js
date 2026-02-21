import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'

// Import Vue Flow styles
import '@vue-flow/core/dist/style.css';
import '@vue-flow/core/dist/theme-default.css';

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')

// Agnostic Integration: Expose initialization helper to window
import { useSchemaStore } from './stores/schemaStore'

window.MongoDiagram = {
    init: (config = {}) => {
        const store = useSchemaStore()
        store.initBridge(config)

        if (config.autoFetch !== false) {
            store.fetchRemoteSchema()
        }

        console.log('Mongo Diagram initialized in remote mode:', store.apiBaseUrl)
    },
    getStore: () => useSchemaStore()
}
