<script setup>
import { computed, ref, watch, onUnmounted } from 'vue'
import { useSchemaStore } from '../stores/schemaStore'
import { useUiStore } from '../stores/uiStore'
import { X, Copy } from 'lucide-vue-next'
import { createDatabaseAdapter } from '../factories/databaseFactory'

const props = defineProps({
    isOpen: Boolean,
    collectionId: {
        type: String,
        default: null
    },
    collectionIds: {
        type: Array,
        default: () => []
    }
})
const emit = defineEmits(['close'])

const store = useSchemaStore()
const ui = useUiStore()
const adapter = computed(() => createDatabaseAdapter(store.activeDatabaseType))

const resolveTargetCollections = () => {
    const activeDbId = store.activeDatabaseId
    const activeCollections = store.collections.filter((collection) => collection.databaseId === activeDbId)

    if (props.collectionIds.length > 0) {
        const ids = new Set(props.collectionIds)
        return activeCollections.filter((collection) => ids.has(collection.id))
    }

    if (props.collectionId) {
        return activeCollections.filter((collection) => collection.id === props.collectionId)
    }

    return activeCollections
}

const code = computed(() => {
    return adapter.value.generateCode({
        store,
        collectionId: props.collectionId,
        collectionIds: props.collectionIds,
        collections: resolveTargetCollections(),
    })
})
const editorContainer = ref(null)
const isLoading = ref(true)
const language = computed(() => adapter.value.getLanguage())
let editorInstance = null

const copyToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(code.value)
        ui.showToast('Code copied to clipboard.', 'success')
    } catch (error) {
        ui.showToast('Failed to copy code.', 'error')
    }
}

const initMonaco = () => {
    if (editorInstance) return;
    
    isLoading.value = true;

    // Helper to create editor
    const createEditor = () => {
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }});
        require(['vs/editor/editor.main'], function() {
            isLoading.value = false;
            if (!editorContainer.value) return;
            
            // Dispose existing if any (safety check)
            if (editorInstance) editorInstance.dispose();

            editorInstance = monaco.editor.create(editorContainer.value, {
                value: code.value,
                language: language.value,
                theme: 'vs-dark',
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                padding: { top: 16 }
            });
        });
    }
    
    // Check if loader already exists
    if (window.monaco && window.monaco.editor) {
        createEditor();
        return;
    }

    if (document.getElementById('monaco-loader')) {
        // Script exists but maybe not loaded yet, wait for it? 
        // Or properly checking window.require
        if (window.require) {
            createEditor();
        } else {
            // Wait for require to be available if script exists
            const interval = setInterval(() => {
                if (window.require) {
                    clearInterval(interval);
                    createEditor();
                }
            }, 100);
        }
        return;
    }
    
    // Load Monaco from CDN
    const script = document.createElement('script');
    script.id = 'monaco-loader';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js';
    script.onload = createEditor;
    document.body.appendChild(script);
}

watch(() => props.isOpen, (newVal) => {
    if (newVal) {
        // Wait for DOM to render modal
        setTimeout(() => {
            initMonaco();
            if(editorInstance) {
                editorInstance.setValue(code.value)
            }
        }, 100)
    } else {
        // Dispose when closed to prevent "editorContainer is null" errors next time
        if (editorInstance) {
            editorInstance.dispose()
            editorInstance = null
        }
    }
})

watch(code, (newCode) => {
    if (editorInstance) {
        editorInstance.setValue(newCode)
        monaco.editor.setModelLanguage(editorInstance.getModel(), language.value)
    }
})

onUnmounted(() => {
    if (editorInstance) {
        editorInstance.dispose()
    }
})
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-[#252525]">
        <h2 class="text-xl font-bold text-white">Export Schema</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white transition-colors">
          <X :size="20" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 bg-[#1e1e1e] overflow-hidden relative">
         <div v-show="isLoading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#1e1e1e]">
            <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
            <span class="text-gray-400 text-sm">Loading Editor...</span>
         </div>
         <div ref="editorContainer" class="w-full h-full" :class="{ 'opacity-0': isLoading }"></div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-700 bg-[#252525] flex justify-end gap-3">
        <button @click="$emit('close')" class="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors">
            Close
        </button>
        <button @click="copyToClipboard" class="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center gap-2 transition-colors">
            <Copy :size="16" />
            Copy Code
        </button>
      </div>
    </div>
  </div>
</template>
