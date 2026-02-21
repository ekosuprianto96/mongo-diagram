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
const exportTargets = computed(() => adapter.value.getExportTargets())
const selectedExportTarget = ref(adapter.value.getDefaultExportTarget())

const selectedCollectionIds = ref(new Set())

const resolveTargetCollections = () => {
    const activeDbId = store.activeDatabaseId
    const activeCollections = store.collections.filter((collection) => collection.databaseId === activeDbId)

    return activeCollections.filter((collection) => selectedCollectionIds.value.has(collection.id))
}

const activeCollectionsList = computed(() => {
    return store.collections.filter((collection) => collection.databaseId === store.activeDatabaseId)
})

const toggleCollection = (id) => {
    if (selectedCollectionIds.value.has(id)) {
        selectedCollectionIds.value.delete(id)
    } else {
        selectedCollectionIds.value.add(id)
    }
}

const selectAll = () => {
    selectedCollectionIds.value = new Set(activeCollectionsList.value.map(c => c.id))
}

const deselectAll = () => {
    selectedCollectionIds.value.clear()
}

const code = computed(() => {
    const collections = resolveTargetCollections()
    if (collections.length === 0) return '-- No tables selected for export'
    
    return adapter.value.generateCode({
        target: selectedExportTarget.value,
        store,
        collectionId: props.collectionId,
        collectionIds: props.collectionIds,
        collections: collections,
    })
})
const editorContainer = ref(null)
const isLoading = ref(true)
const language = computed(() => adapter.value.getLanguage(selectedExportTarget.value))
const showTableList = ref(true)
const toggleTableList = () => { showTableList.value = !showTableList.value }

const initSelection = () => {
    const collections = activeCollectionsList.value
    if (props.collectionIds.length > 0) {
        selectedCollectionIds.value = new Set(props.collectionIds)
    } else if (props.collectionId) {
        selectedCollectionIds.value = new Set([props.collectionId])
    } else {
        selectedCollectionIds.value = new Set(collections.map(c => c.id))
    }
}

let editorInstance = null

watch(
    [adapter, exportTargets],
    () => {
        const allowed = new Set(exportTargets.value.map((option) => option.value))
        if (!allowed.has(selectedExportTarget.value)) {
            selectedExportTarget.value = adapter.value.getDefaultExportTarget()
        }
    },
    { immediate: true }
)

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
        initSelection()
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
    <div class="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center gap-3 bg-[#252525]">
        <div class="flex min-w-0 items-center gap-3">
          <h2 class="text-xl font-bold text-white">Export Schema</h2>
          <div v-if="exportTargets.length > 1" class="flex items-center gap-2">
            <span class="text-xs uppercase tracking-wide text-gray-400">Target</span>
            <select
              v-model="selectedExportTarget"
              class="min-w-0 bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option v-for="target in exportTargets" :key="target.value" :value="target.value">{{ target.label }}</option>
            </select>
          </div>
        </div>
        <div class="flex items-center gap-3">
            <button 
                @click="toggleTableList"
                class="text-xs px-2 py-1 rounded bg-[#2a2a2a] border border-gray-600 text-gray-300 hover:text-white"
            >
                {{ showTableList ? 'Hide Tables' : 'Show Tables' }}
            </button>
            <button @click="$emit('close')" class="text-gray-400 hover:text-white transition-colors">
            <X :size="20" />
            </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Sidebar: Table Selection -->
        <div v-if="showTableList" class="w-64 border-r border-gray-700 bg-[#1a1a1a] flex flex-col">
            <div class="p-3 border-b border-gray-700 flex items-center justify-between gap-2">
                <span class="text-xs font-bold text-gray-500 uppercase">Select Tables</span>
                <div class="flex gap-2">
                    <button @click="selectAll" class="text-[10px] text-emerald-400 hover:underline">All</button>
                    <button @click="deselectAll" class="text-[10px] text-red-400 hover:underline">None</button>
                </div>
            </div>
            <div class="flex-1 overflow-y-auto p-2 space-y-1">
                <label 
                    v-for="collection in activeCollectionsList" 
                    :key="collection.id"
                    class="flex items-center gap-2 p-2 rounded hover:bg-[#2a2a2a] cursor-pointer transition-colors"
                >
                    <input 
                        type="checkbox" 
                        :checked="selectedCollectionIds.has(collection.id)"
                        @change="toggleCollection(collection.id)"
                        class="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500"
                    >
                    <span class="text-sm text-gray-300 truncate">{{ collection.data.label }}</span>
                </label>
            </div>
        </div>

        <!-- Main: Code Editor -->
        <div class="flex-1 bg-[#1e1e1e] overflow-hidden relative">
            <div v-show="isLoading" class="absolute inset-0 flex flex-col items-center justify-center z-10 bg-[#1e1e1e]">
                <div class="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <span class="text-gray-400 text-sm">Loading Editor...</span>
            </div>
            <div ref="editorContainer" class="w-full h-full" :class="{ 'opacity-0': isLoading }"></div>
        </div>
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
