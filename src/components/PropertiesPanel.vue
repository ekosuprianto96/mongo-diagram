<script setup>
import { computed } from 'vue'
import { useSchemaStore } from '../stores/schemaStore'
import { Trash2, AlertCircle } from 'lucide-vue-next'

const store = useSchemaStore()

const selectedItem = computed(() => store.selectedItem)
const isCollection = computed(() => store.selectedItemType === 'collection')
const isField = computed(() => store.selectedItemType === 'field')
const isEdge = computed(() => store.selectedItemType === 'edge')

// Field Types
const fieldTypes = [
  'String', 'Number', 'ObjectId', 'Date', 'Boolean', 'Array', 'Object', 'Map', 'Buffer', 'Mixed'
]

// Handlers
const updateLabel = (e) => {
    if (isCollection.value) {
        store.updateCollectionProps(store.selectedItemId, { label: e.target.value })
    } else if (isField.value) {
        store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { name: e.target.value })
    }
}

const updateType = (e) => {
    if (isField.value) {
        store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { type: e.target.value })
    }
}

const toggleProp = (prop) => {
    if (isField.value) {
        const currentVal = selectedItem.value[prop] || false
        store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { [prop]: !currentVal })
    }
}

const deleteItem = () => {
    if(!confirm("Are you sure?")) return;

    if (isCollection.value) {
        store.removeCollection(store.selectedItemId)
    } else if (isField.value) {
        store.removeField(store.selectedCollectionId, store.selectedItemId)
    } else if (isEdge.value) {
        store.removeEdge(store.selectedItemId)
    }
}

</script>

<template>
  <aside class="w-80 bg-[#1e1e1e] border-l border-gray-700 flex flex-col h-full overflow-y-auto">
    <div class="p-4 border-b border-gray-700">
      <h2 class="font-bold text-gray-200">Properties</h2>
    </div>

    <!-- Empty State -->
    <div v-if="!selectedItem && !isEdge" class="flex-1 flex flex-col items-center justify-center text-gray-500 p-8 text-center">
      <AlertCircle :size="48" class="mb-4 opacity-50" />
      <p class="text-sm">Select a collection, field, or relationship to edit properties</p>
    </div>

    <!-- Edge Editor -->
    <div v-else-if="isEdge" class="p-4 space-y-6">
        <div class="p-4 bg-[#2a2a2a] rounded text-center">
            <h3 class="text-gray-300 font-medium mb-2">Relationship Selected</h3>
            <p class="text-xs text-gray-500">You can delete this relationship connection.</p>
        </div>

        <div class="pt-4 border-t border-gray-700">
             <button @click="deleteItem" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 rounded transition-colors text-sm">
                <Trash2 :size="16" />
                Delete Relationship
            </button>
        </div>
    </div>

    <!-- Collection Editor -->
    <div v-else-if="isCollection" class="p-4 space-y-6">
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Collection Name</label>
            <input 
                :value="selectedItem.data.label" 
                @input="updateLabel"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" 
                type="text" 
            />
        </div>

        <!-- Schema Options -->
        <div class="space-y-3">
             <label class="block text-xs font-bold text-gray-500 uppercase">Schema Options</label>
             
             <!-- Timestamps Toggle -->
             <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                <span class="text-sm text-gray-300">Timestamps</span>
                <button 
                    @click="store.updateCollectionProps(store.selectedItemId, { timestampsEnabled: !selectedItem.data.timestampsEnabled })"
                    class="w-10 h-5 rounded-full relative transition-colors"
                    :class="selectedItem.data.timestampsEnabled ? 'bg-emerald-500' : 'bg-gray-600'"
                >
                    <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"
                         :class="selectedItem.data.timestampsEnabled ? 'translate-x-5' : ''"
                    ></div>
                </button>
             </div>

             <!-- Custom Timestamp Names -->
             <div v-if="selectedItem.data.timestampsEnabled" class="space-y-2 pl-2 border-l-2 border-emerald-500/30">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Created At Field</label>
                    <input 
                        :value="selectedItem.data.createdAtName" 
                        @input="(e) => store.updateCollectionProps(store.selectedItemId, { createdAtName: e.target.value })"
                        class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none transition-colors" 
                        type="text" 
                        placeholder="default: createdAt"
                    />
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Updated At Field</label>
                    <input 
                        :value="selectedItem.data.updatedAtName" 
                        @input="(e) => store.updateCollectionProps(store.selectedItemId, { updatedAtName: e.target.value })"
                        class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none transition-colors" 
                        type="text" 
                        placeholder="default: updatedAt"
                    />
                </div>
             </div>
        </div>

        <div class="pt-4 border-t border-gray-700">
             <button @click="deleteItem" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 rounded transition-colors text-sm">
                <Trash2 :size="16" />
                Delete Collection
            </button>
        </div>
    </div>

    <!-- Field Editor -->
    <div v-else-if="isField" class="p-4 space-y-6">
        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Field Name</label>
            <input 
                :value="selectedItem.name" 
                @input="updateLabel"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" 
                type="text" 
            />
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Type</label>
            <select 
                :value="selectedItem.type"
                @change="updateType"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors appearance-none"
            >
                <option v-for="t in fieldTypes" :key="t" :value="t">{{ t }}</option>
            </select>
        </div>

        <div v-if="selectedItem.type === 'ObjectId'">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Reference to Collection</label>
            <select 
                :value="selectedItem.ref" 
                @change="(e) => store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { ref: e.target.value })"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors appearance-none"
            >
                <option value="">Select Target Collection...</option>
                <option v-for="col in store.collections" :key="col.id" :value="col.data.label">
                    {{ col.data.label }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Default Value</label>
            <input 
                :value="selectedItem.default" 
                @input="(e) => store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { default: e.target.value })"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" 
                type="text" 
                placeholder="e.g. 'active' or 0"
            />
        </div>

        <div v-if="selectedItem.type === 'String'" class="mt-4">
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">Enum Options (comma separated)</label>
            <input 
                :value="selectedItem.enum" 
                @input="(e) => store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { enum: e.target.value })"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" 
                type="text" 
                placeholder="USER, ADMIN, GUEST"
            />
        </div>


        <div class="space-y-3">
             <label class="block text-xs font-bold text-gray-500 uppercase">Options</label>
             
             <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                <span class="text-sm text-gray-300">Required</span>
                <button 
                    @click="toggleProp('required')"
                    class="w-10 h-5 rounded-full relative transition-colors"
                    :class="selectedItem.required ? 'bg-emerald-500' : 'bg-gray-600'"
                >
                    <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"
                         :class="selectedItem.required ? 'translate-x-5' : ''"
                    ></div>
                </button>
             </div>

             <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                <span class="text-sm text-gray-300">Unique</span>
                <button 
                    @click="toggleProp('unique')"
                    class="w-10 h-5 rounded-full relative transition-colors"
                    :class="selectedItem.unique ? 'bg-emerald-500' : 'bg-gray-600'"
                >
                    <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"
                         :class="selectedItem.unique ? 'translate-x-5' : ''"
                    ></div>
                </button>
             </div>

             <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                <span class="text-sm text-gray-300">Index</span>
                <button 
                    @click="toggleProp('index')"
                    class="w-10 h-5 rounded-full relative transition-colors"
                    :class="selectedItem.index ? 'bg-emerald-500' : 'bg-gray-600'"
                >
                    <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform"
                         :class="selectedItem.index ? 'translate-x-5' : ''"
                    ></div>
                </button>
             </div>
        </div>

         <div class="pt-4 border-t border-gray-700">
             <button @click="deleteItem" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 rounded transition-colors text-sm">
                <Trash2 :size="16" />
                Delete Field
            </button>
        </div>
    </div>
  </aside>
</template>
