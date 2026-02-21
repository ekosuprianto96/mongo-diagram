<script setup>
import { computed, onMounted, ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import Sidebar from './components/Sidebar.vue'
import DiagramCanvas from './components/DiagramCanvas.vue'
import CodeExport from './components/CodeExport.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import MigrationSyncModal from './components/MigrationSyncModal.vue'
import UiLayer from './components/UiLayer.vue'
import { Sparkles, Download, Share2, Undo2, Redo2, PanelLeftOpen, Code, Trash2, Network, GripVertical, Save } from 'lucide-vue-next'
import { useSchemaStore } from './stores/schemaStore'
import { useUiStore } from './stores/uiStore'
import { getDatabaseEntityTerms } from './factories/databaseFactory'

const isExportOpen = ref(false)
const isMigrationOpen = ref(false)
const isToolbarOpen = ref(true)
const lastMigrationHash = ref(null)
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

const handleAutoArrange = async () => {
    const didArrange = store.autoArrangeActiveDatabase()
    if (didArrange) {
        ui.showToast(`${entityTerms.value.plural} arranged automatically.`, 'success')
        // Automatically persist layout to backend
        if (ui.isPackageMode && store.bridgeMode === 'remote') {
            await store.saveLayout()
        }
        return
    }
    ui.showToast(`Need at least 2 ${entityTerms.value.pluralLower} to arrange.`, 'error')
}

const toggleSidebar = () => {
    isSidebarOpen.value = !isSidebarOpen.value
}

const checkMigrationChanges = async () => {
    if (!ui.isPackageMode || store.bridgeMode !== 'remote') return

    try {
        const response = await fetch(`${window.location.origin}/visual-migrator/api/schema?check_hash=true`)
        if (!response.ok) return
        
        const data = await response.json()
        if (data.hash && data.hash !== lastMigrationHash.value) {
            // Initial load shouldn't toast if null
            if (lastMigrationHash.value !== null) {
                // If there are unsaved changes, don't auto-overwrite
                if (store.isDirty) {
                    ui.showToast('New migrations detected. Save your changes to see them.', 'info')
                    return
                }
                ui.showToast('New migrations detected! Updating diagram...', 'info')
            }
            lastMigrationHash.value = data.hash
            await store.fetchRemoteSchema()
        }
    } catch (e) {
        // Silently ignore polling errors to not annoy user
    }
}

onMounted(() => {
    store.initializeDatabases()
    store.clearSelections()
    store.initializeHistory()

    if (ui.isPackageMode) {
        checkMigrationChanges() // Immediate check
        // Poll every 5s, but only when tab is visible
        useIntervalFn(checkMigrationChanges, 5000, {
            immediate: false,
            visibilityControl: true
        })
    }
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
        
        <!-- Integrated Floating Toolbar (Wireframe Style) -->
        <div 
          class="absolute top-4 right-4 z-50 flex items-center bg-[#1e1e1e]/95 backdrop-blur-md border border-gray-700/50 rounded-lg shadow-2xl transition-all duration-500 ease-in-out h-[42px] overflow-hidden"
          :class="isToolbarOpen ? 'max-w-[2000px] pr-1' : 'max-w-[42px]'"
        >
          <!-- The content that expands/collapses -->
          <div 
            class="flex items-center flex-nowrap gap-1.5 overflow-hidden transition-all duration-500 ease-in-out"
            :class="isToolbarOpen ? 'max-w-[1200px] opacity-100 px-2' : 'max-w-0 opacity-0 px-0 invisible'"
          >
              <button @click="handleUndo" :disabled="!store.canUndo || !store.isDirty" class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:hover:bg-[#2d2d2d] text-gray-300 hover:text-white disabled:text-gray-500 rounded text-sm font-medium transition-colors border border-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" title="Undo (Ctrl/Cmd+Z)">
                  <Undo2 :size="16" />
                  Undo
              </button>
              <button @click="handleRedo" :disabled="!store.canRedo || !store.isDirty" class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] disabled:hover:bg-[#2d2d2d] text-gray-300 hover:text-white disabled:text-gray-500 rounded text-sm font-medium transition-colors border border-gray-600/30 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap" title="Redo (Ctrl/Cmd+Shift+Z / Ctrl+Y)">
                  <Redo2 :size="16" />
                  Redo
              </button>
              <div class="flex-shrink-0 w-px h-6 bg-gray-700/50 mx-0.5"></div>
              <button @click="handleAutoArrange" class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/30 whitespace-nowrap" title="Auto Arrange">
                  <Network :size="16" />
                  Auto Arrange
              </button>
              <div class="flex-shrink-0 w-px h-6 bg-gray-700/50 mx-0.5"></div>
              <button @click="handleAiAnalysis" class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-sm font-medium transition-all shadow-lg shadow-purple-900/20 whitespace-nowrap border border-purple-500/20">
                  <Sparkles :size="16" />
                  AI Analyze
              </button>
              <div class="flex-shrink-0 w-px h-6 bg-gray-700/50 mx-0.5"></div>
              <button v-if="ui.isPackageMode && store.bridgeMode === 'remote'" @click="isMigrationOpen = true" class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 whitespace-nowrap border border-emerald-500/30">
                  <Save :size="16" />
                  Save to Migrations
              </button>
              <div v-if="ui.isPackageMode && store.bridgeMode === 'remote'" class="flex-shrink-0 w-px h-6 bg-gray-700/50 mx-0.5"></div>
              <button @click="openExportGlobal" class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/30 whitespace-nowrap">
                  <Download :size="16" />
                  Export
              </button>
              <button class="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/30 whitespace-nowrap">
                  <Share2 :size="16" />
                  Share
              </button>
          </div>

          <!-- Integrated Grip Toggle Button -->
          <button 
            @click="isToolbarOpen = !isToolbarOpen"
            class="flex items-center justify-center w-8 h-8 m-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer relative group shrink-0"
            :title="isToolbarOpen ? 'Collapse Menu' : 'Expand Menu'"
          >
            <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 rounded transition-opacity"></div>
            <GripVertical :size="20" />
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
      <MigrationSyncModal
        :is-open="isMigrationOpen"
        @close="isMigrationOpen = false"
      />
      <UiLayer />
    </main>
  </div>
</template>
