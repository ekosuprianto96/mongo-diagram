<script setup>
import { computed, ref } from 'vue'
import { useSchemaStore } from '../stores/schemaStore'
import { useUiStore } from '../stores/uiStore'
import { Plus, Database, Code, Trash2, Download, Upload, PanelLeftClose, LayoutGrid } from 'lucide-vue-next'
import CreateDatabaseModal from './CreateDatabaseModal.vue'
import { createDatabaseAdapter, getDatabaseEntityTerms, getNextDefaultEntityName } from '../factories/databaseFactory'

const store = useSchemaStore()
const ui = useUiStore()
const emit = defineEmits(['export-collection', 'toggle-sidebar'])
const importInput = ref(null)
const isCreateDbModalOpen = ref(false)
const entityTerms = computed(() => getDatabaseEntityTerms(store.activeDatabaseType))
const appVersion = `v${__APP_VERSION__ || import.meta.env.VITE_APP_VERSION || '0.0.0'}`

const handleAutoLayout = () => {
    if (!store.activeDatabaseId) return
    const changed = store.autoArrangeActiveDatabase()
    if (changed) {
        ui.showToast('Auto-layout applied.', 'success')
    } else {
        ui.showToast('Not enough items to layout.', 'info')
    }
}

const addNewCollection = () => {
    if (!store.activeDatabaseId) return
    const id = Date.now().toString()
    
    // Get default field based on DB Type
    const dbAdapter = createDatabaseAdapter(store.activeDatabaseType)
    const defaultField = { ...dbAdapter.getDefaultField(), id: `f-${Date.now()}-1` }
    const nextEntityName = getNextDefaultEntityName(
        store.activeDatabaseType,
        store.activeCollections.map((collection) => collection?.data?.label)
    )

    store.addCollection({
        id,
        type: 'collection',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
            label: nextEntityName,
            fields: [defaultField]
        }
    })
    store.selectItem(id, 'collection')
}

const openCreateDbModal = () => {
    isCreateDbModalOpen.value = true
}

const handleCreateDatabase = ({ name, type }) => {
    store.addDatabase(name, type)
    ui.showToast(`Database "${name}" (${type}) created.`, 'success')
    isCreateDbModalOpen.value = false
}

const selectDatabase = (event) => {
    store.setActiveDatabase(event.target.value)
}

const deleteActiveDatabase = async () => {
    const activeDb = store.activeDatabase
    if (!activeDb) return
    const confirmed = await ui.openConfirm({
        title: 'Delete Database',
        message: `Delete database "${activeDb.name}" and all its ${entityTerms.value.pluralLower}?`,
        confirmText: 'Delete',
    })
    if (!confirmed) return
    const result = store.removeDatabase(activeDb.id)
    if (!result.success && result.message) {
        ui.showToast(result.message, 'error')
        return
    }
    ui.showToast(`Database "${activeDb.name}" deleted.`, 'success')
}

const selectCollection = (event, id) => {
    const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
    store.setCollectionSelection(id, isMultiSelect)
}

const deleteCollection = async (id) => {
    const confirmed = await ui.openConfirm({
        title: `Delete ${entityTerms.value.singular}`,
        message: `Are you sure you want to delete this ${entityTerms.value.singularLower}?`,
        confirmText: 'Delete',
    })
    if (!confirmed) return
    store.removeCollection(id)
    ui.showToast(`${entityTerms.value.singular} deleted.`, 'success')
}

const exportProjectFile = () => {
    const json = store.exportProject()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mongo-diagram-project-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
}

const triggerImportProject = () => {
    importInput.value?.click()
}

const handleImportProject = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
        const content = await file.text()
        const result = store.importProject(content)
        if (!result.success) {
            ui.showToast(`Import failed: ${result.message}`, 'error')
            return
        }
        ui.showToast('Project imported successfully.', 'success')
    } catch (error) {
        ui.showToast('Import failed: unable to read file.', 'error')
    } finally {
        event.target.value = ''
    }
}
</script>

<template>
    <aside class="w-64 bg-[#1e1e1e] border-r border-gray-700 flex flex-col h-full">
        <div class="p-4 border-b border-gray-700 flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-white font-bold">
                M
            </div>
            <h1 class="text-white font-bold text-lg flex-1">Mongo Diagram</h1>
            <button
                @click="$emit('toggle-sidebar')"
                class="p-1.5 rounded hover:bg-[#2a2a2a] text-gray-400 hover:text-white transition-colors"
                title="Hide Sidebar"
            >
                <PanelLeftClose :size="16" />
            </button>
        </div>

        <div class="p-4 space-y-4 flex-1 overflow-y-auto">
            <div class="space-y-2">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Database</p>
                <div class="flex min-w-0 gap-2">
                    <select
                        :value="store.activeDatabaseId"
                        @change="selectDatabase"
                        class="min-w-0 flex-1 bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1.5 text-white text-sm focus:border-emerald-500 focus:outline-none"
                    >
                        <option v-for="db in store.databases" :key="db.id" :value="db.id">{{ db.name }}</option>
                    </select>
                    <button @click="openCreateDbModal" class="shrink-0 px-2 py-1.5 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 border border-gray-600/70" title="Create Database">
                        <Plus :size="14" />
                    </button>
                    <button @click="deleteActiveDatabase" class="shrink-0 px-2 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 border border-red-900/60" title="Delete Active Database">
                        <Trash2 :size="14" />
                    </button>
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">{{ entityTerms.plural }}</p>
                    <button @click="handleAutoLayout" class="p-1 hover:bg-[#2a2a2a] rounded text-gray-500 hover:text-white transition-colors" title="Auto Layout / Arrange Nodes">
                        <LayoutGrid :size="14" />
                    </button>
                </div>
                <div v-for="collection in store.activeCollections" :key="collection.id" 
                     @click="selectCollection($event, collection.id)"
                     class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group"
                     :class="collection.selected || store.selectedItemId === collection.id ? 'bg-[#2a2a2a] text-emerald-400' : 'hover:bg-[#2a2a2a] text-gray-300 hover:text-white'">
                    <Database :size="16" />
                    <span class="text-sm truncate flex-1">{{ collection.data.label }}</span>
                    
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click.stop="$emit('export-collection', collection.id)" class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Export Code">
                            <Code :size="12" />
                        </button>
                        <button @click.stop="deleteCollection(collection.id)" class="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" :title="`Delete ${entityTerms.singular}`">
                            <Trash2 :size="12" />
                        </button>
                    </div>
                </div>
                
                <button @click="addNewCollection" 
                        class="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded text-sm text-gray-300 transition-colors border border-gray-600 border-dashed">
                    <Plus :size="16" />
                    New {{ entityTerms.singular }}
                </button>
            </div>

            <div class="space-y-2">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Project</p>
                <button @click="exportProjectFile" class="w-full flex items-center gap-2 p-2 rounded hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors text-left">
                    <Download :size="16" />
                    <span class="text-sm">Export Project (.json)</span>
                </button>
                <button @click="triggerImportProject" class="w-full flex items-center gap-2 p-2 rounded hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors text-left">
                    <Upload :size="16" />
                    <span class="text-sm">Import Project (.json)</span>
                </button>
                <input
                    ref="importInput"
                    type="file"
                    accept=".json,application/json"
                    class="hidden"
                    @change="handleImportProject"
                />
            </div>
        </div>

        <div class="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
            {{ appVersion }}
        </div>
    </aside>
    <CreateDatabaseModal 
        :is-open="isCreateDbModalOpen" 
        @close="isCreateDbModalOpen = false"
        @create="handleCreateDatabase"
    />
</template>
