<script setup>
import { computed, onMounted, ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import DiagramCanvas from './components/DiagramCanvas.vue'
import CodeExport from './components/CodeExport.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import UiLayer from './components/UiLayer.vue'
import { Sparkles, Download, Share2, Undo2, Redo2, PanelLeftOpen, Code, Trash2, Network } from 'lucide-vue-next'
import { useSchemaStore } from './stores/schemaStore'
import { useUiStore } from './stores/uiStore'
import { getDatabaseEntityTerms } from './factories/databaseFactory'

const isExportOpen = ref(false)
const exportCollectionId = ref(null)
const exportCollectionIds = ref([])
const isSidebarOpen = ref(true)
const store = useSchemaStore()
const ui = useUiStore()
const entityTerms = computed(() => getDatabaseEntityTerms(store.activeDatabaseType))
const shouldShowPropertiesPanel = computed(() => {
    return store.selectedItemType === 'collection' || store.selectedItemType === 'field' || store.selectedItemType === 'edge'
})
const selectedCollections = computed(() => store.activeCollections.filter((collection) => collection.selected))
const shouldShowBulkActions = computed(() => selectedCollections.value.length > 1)
const bulkActionPositionClass = computed(() => isSidebarOpen.value ? 'left-[1.05rem] top-4' : 'left-4 top-16')

const handleAiAnalysis = () => {
  ui.showToast("AI Assistant: Analysis complete! Consider indexing 'email' in Users.", 'success')
}

const openExportGlobal = () => {
    exportCollectionId.value = null
    exportCollectionIds.value = []
    isExportOpen.value = true
}

const openExportForCollection = (id) => {
    exportCollectionIds.value = []
    exportCollectionId.value = id
    isExportOpen.value = true
}

const openExportForSelectedCollections = (ids) => {
    exportCollectionId.value = null
    exportCollectionIds.value = ids
    isExportOpen.value = true
}

const exportBulkSelectedCollections = () => {
    const ids = selectedCollections.value.map((collection) => collection.id)
    if (ids.length < 2) return
    openExportForSelectedCollections(ids)
}

const deleteBulkSelectedCollections = async () => {
    const ids = selectedCollections.value.map((collection) => collection.id)
    if (ids.length < 2) return
    const confirmed = await ui.openConfirm({
        title: `Delete Selected ${entityTerms.value.plural}`,
        message: `Delete ${ids.length} selected ${entityTerms.value.pluralLower}? This action cannot be undone immediately.`,
        confirmText: 'Delete',
    })
    if (!confirmed) return
    store.removeCollections(ids)
    ui.showToast(`${ids.length} ${entityTerms.value.pluralLower} deleted.`, 'success')
}

const handleUndo = () => {
    store.undo()
}

const handleRedo = () => {
    store.redo()
}

const handleAutoArrange = () => {
    const didArrange = store.autoArrangeActiveDatabase()
    if (didArrange) {
        ui.showToast(`${entityTerms.value.plural} arranged automatically.`, 'success')
        return
    }
    ui.showToast(`Need at least 2 ${entityTerms.value.pluralLower} to arrange.`, 'error')
}

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
}

onMounted(() => {
    store.initializeDatabases()
    store.clearSelections()
    store.initializeHistory()
})
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#1a1a1a] text-white font-sans antialiased">
    <Sidebar
      v-if="isSidebarOpen"
      @toggle-sidebar="toggleSidebar"
      @export-collection="openExportForCollection"
    />
    <main class="flex-1 h-full w-full relative flex">
      <div class="flex-1 relative h-full">
        <DiagramCanvas />

        <button
          v-if="!isSidebarOpen"
          @click="toggleSidebar"
          class="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 bg-[#1e1e1e]/90 backdrop-blur border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:bg-[#2a2a2a] transition-colors"
          title="Show Sidebar"
        >
          <PanelLeftOpen :size="16" />
          Menu
        </button>

        <div
          v-if="shouldShowBulkActions"
          :class="bulkActionPositionClass"
          class="absolute z-20 bg-[#1e1e1e]/90 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-2 flex gap-2"
        >
          <button @click="exportBulkSelectedCollections" class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/50">
            <Code :size="16" />
            Export Selected {{ entityTerms.plural }}
          </button>
          <button @click="deleteBulkSelectedCollections" class="flex items-center gap-2 px-3 py-1.5 bg-red-900/25 hover:bg-red-900/40 text-red-300 hover:text-red-200 rounded text-sm font-medium transition-colors border border-red-800/60">
            <Trash2 :size="16" />
            Delete Selected {{ entityTerms.plural }}
          </button>
        </div>
        
        <!-- Floating Toolbar -->
        <div class="absolute top-4 right-4 bg-[#1e1e1e]/90 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-2 flex gap-2 z-10">
            <button @click="handleUndo" :disabled="!store.canUndo || !store.isDirty" class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:hover:bg-[#2d2d2d] text-gray-300 hover:text-white disabled:text-gray-500 rounded text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-60 disabled:cursor-not-allowed" title="Undo (Ctrl/Cmd+Z)">
                <Undo2 :size="16" />
                Undo
            </button>
            <button @click="handleRedo" :disabled="!store.canRedo || !store.isDirty" class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:hover:bg-[#2d2d2d] text-gray-300 hover:text-white disabled:text-gray-500 rounded text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-60 disabled:cursor-not-allowed" title="Redo (Ctrl/Cmd+Shift+Z / Ctrl+Y)">
                <Redo2 :size="16" />
                Redo
            </button>
            <div class="w-px bg-gray-700 mx-1"></div>
            <button @click="handleAutoArrange" class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/50" title="Auto Arrange">
                <Network :size="16" />
                Auto Arrange
            </button>
            <div class="w-px bg-gray-700 mx-1"></div>
            <button @click="handleAiAnalysis" class="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-sm font-medium transition-all shadow-lg shadow-purple-900/20">
                <Sparkles :size="16" />
                AI Analyze
            </button>
            <div class="w-px bg-gray-700 mx-1"></div>
            <button @click="openExportGlobal" class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/50">
                <Download :size="16" />
                Export
            </button>
            <button class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/50">
                <Share2 :size="16" />
                Share
            </button>
        </div>
      </div>

      <PropertiesPanel v-if="shouldShowPropertiesPanel" />

      <CodeExport 
        :isOpen="isExportOpen" 
        :collectionId="exportCollectionId"
        :collectionIds="exportCollectionIds"
        @close="isExportOpen = false" 
      />
      <UiLayer />
    </main>
  </div>
</template>
