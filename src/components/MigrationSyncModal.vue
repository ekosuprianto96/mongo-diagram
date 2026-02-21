<script setup>
import { computed, ref, watch } from 'vue'
import { useSchemaStore } from '../stores/schemaStore'
import { useUiStore } from '../stores/uiStore'
import { X, Save, CheckCircle2, AlertCircle } from 'lucide-vue-next'

const props = defineProps({
    isOpen: Boolean
})
const emit = defineEmits(['close'])

const store = useSchemaStore()
const ui = useUiStore()

const activeCollections = computed(() => {
    return store.collections.filter(c => c.databaseId === store.activeDatabaseId)
})

const selectedIds = ref(new Set())
const isProcessing = ref(false)

const initSelection = () => {
    selectedIds.value = new Set(activeCollections.value.map(c => c.id))
}

watch(() => props.isOpen, (val) => {
    if (val) initSelection()
})

const toggleTable = (id) => {
    if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id)
    } else {
        selectedIds.value.add(id)
    }
}

const selectAll = () => {
    selectedIds.value = new Set(activeCollections.value.map(c => c.id))
}

const deselectAll = () => {
    selectedIds.value.clear()
}

const handleSync = async () => {
    if (selectedIds.value.size === 0) {
        ui.showToast('Please select at least one table to sync', 'error')
        return
    }

    isProcessing.value = true
    try {
        const result = await store.saveProject(Array.from(selectedIds.value))
        if (result.success) {
            emit('close')
            ui.showToast(result.response?.message || 'Sync successful', 'success')
        }
    } catch (error) {
        ui.showToast('Failed to sync migrations', 'error')
    } finally {
        isProcessing.value = false
    }
}
</script>

<template>
    <div v-if="isOpen" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
        <div class="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-[#252525]">
                <div class="flex items-center gap-2">
                    <Save :size="18" class="text-emerald-500" />
                    <h2 class="text-lg font-bold text-white">Sync to Migrations</h2>
                </div>
                <button @click="$emit('close')" class="text-gray-400 hover:text-white transition-colors" :disabled="isProcessing">
                    <X :size="20" />
                </button>
            </div>

            <!-- Content -->
            <div class="p-6 space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Tables to Sync</span>
                    <div class="flex gap-3">
                        <button @click="selectAll" class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors" :disabled="isProcessing">Select All</button>
                        <button @click="deselectAll" class="text-xs text-red-400 hover:text-red-300 transition-colors" :disabled="isProcessing">Clear All</button>
                    </div>
                </div>

                <div class="max-h-[40vh] overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                    <label 
                        v-for="collection in activeCollections" 
                        :key="collection.id"
                        class="flex items-center gap-3 p-3 rounded bg-[#2a2a2a]/50 hover:bg-[#2a2a2a] cursor-pointer transition-colors border border-transparent hover:border-gray-700"
                    >
                        <input 
                            type="checkbox" 
                            :checked="selectedIds.has(collection.id)"
                            @change="toggleTable(collection.id)"
                            class="rounded border-gray-600 bg-gray-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                            :disabled="isProcessing"
                        >
                        <span class="text-sm text-gray-200 font-medium truncate">{{ collection.data.label }}</span>
                    </label>
                </div>

                <div class="p-3 rounded bg-blue-500/10 border border-blue-500/20 flex gap-3">
                    <AlertCircle :size="18" class="text-blue-400 shrink-0" />
                    <p class="text-[11px] text-blue-300 leading-relaxed">
                        This action will generate or update Laravel migration files for the selected tables. Existing migrations for these tables may be overwritten or appended.
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-700 bg-[#252525] flex justify-end gap-3">
                <button 
                    @click="$emit('close')" 
                    class="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors"
                    :disabled="isProcessing"
                >
                    Cancel
                </button>
                <button 
                    @click="handleSync" 
                    class="px-6 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="isProcessing || selectedIds.size === 0"
                >
                    <template v-if="isProcessing">
                        <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Syncing...</span>
                    </template>
                    <template v-else>
                        <CheckCircle2 :size="18" />
                        <span>Start Sync ({{ selectedIds.size }})</span>
                    </template>
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #3f3f46;
    border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #52525b;
}
</style>
