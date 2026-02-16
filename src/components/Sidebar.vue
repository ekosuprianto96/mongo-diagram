<script setup>
import { useSchemaStore } from '../stores/schemaStore'
import { Plus, Database, Code, Trash2 } from 'lucide-vue-next'

const store = useSchemaStore()
const emit = defineEmits(['export-collection'])

const addNewCollection = () => {
    const id = Date.now().toString()
    store.addCollection({
        id,
        type: 'collection',
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        data: {
            label: 'New Collection',
            fields: [
                { id: `f-${Date.now()}-1`, name: '_id', type: 'ObjectId', key: true }
            ]
        }
    })
    store.selectItem(id, 'collection')
}

const selectCollection = (id) => {
    store.selectItem(id, 'collection')
}

const deleteCollection = (id) => {
    if (confirm('Are you sure you want to delete this collection?')) {
        store.removeCollection(id)
    }
}
</script>

<template>
    <aside class="w-64 bg-[#1e1e1e] border-r border-gray-700 flex flex-col h-full">
        <div class="p-4 border-b border-gray-700 flex items-center gap-2">
            <div class="w-8 h-8 rounded bg-emerald-500 flex items-center justify-center text-white font-bold">
                M
            </div>
            <h1 class="text-white font-bold text-lg">Mongo Diagram</h1>
        </div>

        <div class="p-4 space-y-4 flex-1 overflow-y-auto">
            <div class="space-y-2">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Collections</p>
                <div v-for="collection in store.collections" :key="collection.id" 
                     @click="selectCollection(collection.id)"
                     class="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors group"
                     :class="store.selectedItemId === collection.id ? 'bg-[#2a2a2a] text-emerald-400' : 'hover:bg-[#2a2a2a] text-gray-300 hover:text-white'">
                    <Database :size="16" />
                    <span class="text-sm truncate flex-1">{{ collection.data.label }}</span>
                    
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click.stop="$emit('export-collection', collection.id)" class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white" title="Export Code">
                            <Code :size="12" />
                        </button>
                        <button @click.stop="deleteCollection(collection.id)" class="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-400" title="Delete Collection">
                            <Trash2 :size="12" />
                        </button>
                    </div>
                </div>
                
                <button @click="addNewCollection" 
                        class="w-full mt-2 flex items-center justify-center gap-2 p-2 bg-[#2d2d2d] hover:bg-[#3d3d3d] rounded text-sm text-gray-300 transition-colors border border-gray-600 border-dashed">
                    <Plus :size="16" />
                    New Collection
                </button>
            </div>

            <div class="space-y-2">
                <p class="text-xs font-bold text-gray-500 uppercase tracking-wider">Export</p>
                <button class="w-full flex items-center gap-2 p-2 rounded hover:bg-[#2a2a2a] text-gray-300 hover:text-white transition-colors text-left">
                    <Code :size="16" />
                    <span class="text-sm">Export Mongoose Schema</span>
                </button>
            </div>
        </div>

        <div class="p-4 border-t border-gray-700 text-xs text-gray-500 text-center">
            v1.0.0
        </div>
    </aside>
</template>
