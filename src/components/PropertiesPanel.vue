<script setup>
import { computed } from 'vue'
import { useSchemaStore } from '../stores/schemaStore'
import { useUiStore } from '../stores/uiStore'
import { Trash2, AlertCircle } from 'lucide-vue-next'

import { DB_TYPES, FIELD_TYPES } from '../constants/dbTypes'
import { getDatabaseEntityTerms } from '../factories/databaseFactory'

const store = useSchemaStore()
const ui = useUiStore()

const selectedItem = computed(() => store.selectedItem)
const isCollection = computed(() => store.selectedItemType === 'collection')
const isField = computed(() => store.selectedItemType === 'field')
const isEdge = computed(() => store.selectedItemType === 'edge')
const activeDbType = computed(() => store.activeDatabaseType)
const entityTerms = computed(() => getDatabaseEntityTerms(activeDbType.value))

// Field Types
const currentFieldTypes = computed(() => FIELD_TYPES[activeDbType.value] || [])
const triStateOptions = [
  { value: '', label: 'Default' },
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
]
const strictModeOptions = [
  { value: '', label: 'Default' },
  { value: 'true', label: 'True' },
  { value: 'false', label: 'False' },
  { value: 'throw', label: 'Throw' },
]
const readPreferenceOptions = [
  { value: '', label: 'Default' },
  { value: 'primary', label: 'primary' },
  { value: 'primaryPreferred', label: 'primaryPreferred' },
  { value: 'secondary', label: 'secondary' },
  { value: 'secondaryPreferred', label: 'secondaryPreferred' },
  { value: 'nearest', label: 'nearest' },
]
const collationCaseFirstOptions = [
  { value: '', label: 'Default' },
  { value: 'upper', label: 'upper' },
  { value: 'lower', label: 'lower' },
  { value: 'off', label: 'off' },
]
const mapArrayTypeOptions = ['String', 'Number', 'Boolean', 'Date', 'ObjectId', 'Object', 'Mixed']
const sqlReferentialActionOptions = [
  { value: '', label: 'No Action' },
  { value: 'CASCADE', label: 'CASCADE' },
  { value: 'RESTRICT', label: 'RESTRICT' },
  { value: 'SET NULL', label: 'SET NULL' },
  { value: 'NO ACTION', label: 'NO ACTION' },
]

const referenceTableOptions = computed(() => store.activeCollections || [])
const selectedReferenceTable = computed(() => {
    if (!isField.value || activeDbType.value === DB_TYPES.MONGODB) return null
    const tableName = String(selectedItem.value?.referencesTable || '')
    return referenceTableOptions.value.find((collection) => collection.data?.label === tableName) || null
})
const referenceFieldOptions = computed(() => selectedReferenceTable.value?.data?.fields || [])

const updateCollectionOption = (key, value) => {
    store.updateCollectionProps(store.selectedItemId, { [key]: value })
}

const updateFieldOption = (key, value) => {
    if (!isField.value) return
    store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { [key]: value })
}

const handleReferenceTableChange = (value) => {
    updateFieldOption('referencesTable', value)
    updateFieldOption('referencesColumnId', '')
    updateFieldOption('referencesColumn', '')
}

const handleReferenceColumnChange = (fieldId) => {
    updateFieldOption('referencesColumnId', fieldId)
    const targetField = referenceFieldOptions.value.find((field) => field.id === fieldId)
    updateFieldOption('referencesColumn', targetField?.name || '')
}

const getEnumValues = () => {
    if (!isField.value || !selectedItem.value) return []
    if (Array.isArray(selectedItem.value.enumValues)) return selectedItem.value.enumValues

    if (typeof selectedItem.value.enum === 'string' && selectedItem.value.enum.trim()) {
        const parsed = selectedItem.value.enum.split(',').map((value) => value.trim()).filter(Boolean)
        store.updateFieldProps(store.selectedCollectionId, store.selectedItemId, { enumValues: parsed, enum: '' })
        return parsed
    }
    return []
}

const addEnumValue = () => {
    updateFieldOption('enumValues', [...getEnumValues(), ''])
}

const updateEnumValue = (index, value) => {
    const values = [...getEnumValues()]
    if (index < 0 || index >= values.length) return
    values[index] = value
    updateFieldOption('enumValues', values)
}

const removeEnumValue = (index) => {
    const values = [...getEnumValues()]
    if (index < 0 || index >= values.length) return
    values.splice(index, 1)
    updateFieldOption('enumValues', values)
}

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

const deleteItem = async () => {
    const confirmed = await ui.openConfirm({
        title: 'Delete Item',
        message: 'Are you sure?',
        confirmText: 'Delete',
    })
    if (!confirmed) return

    if (isCollection.value) {
        store.removeCollection(store.selectedItemId)
        ui.showToast(`${entityTerms.value.singular} deleted.`, 'success')
    } else if (isField.value) {
        store.removeField(store.selectedCollectionId, store.selectedItemId)
        ui.showToast('Field deleted.', 'success')
    } else if (isEdge.value) {
        store.removeEdge(store.selectedItemId)
        ui.showToast('Relationship deleted.', 'success')
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
      <p class="text-sm">Select a {{ entityTerms.singularLower }}, field, or relationship to edit properties</p>
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
            <label class="block text-xs font-bold text-gray-500 uppercase mb-2">{{ entityTerms.singular }} Name</label>
            <input 
                :value="selectedItem.data.label" 
                @input="updateLabel"
                class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors" 
                type="text" 
            />
        </div>

        <!-- Schema Options (MongoDB Only) -->
        <div v-if="activeDbType === DB_TYPES.MONGODB" class="space-y-3">
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



        <div v-if="activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Advanced Schema Options</label>

            <div>
                <label class="block text-[10px] text-gray-400 uppercase mb-1">Collection Name</label>
                <input
                    :value="selectedItem.data.schemaCollectionName || ''"
                    @input="(e) => updateCollectionOption('schemaCollectionName', e.target.value)"
                    class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs focus:border-emerald-500 focus:outline-none transition-colors"
                    type="text"
                    placeholder="default model name plural"
                />
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Strict</label>
                    <select :value="selectedItem.data.schemaStrictMode || ''" @change="(e) => updateCollectionOption('schemaStrictMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in strictModeOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Strict Query</label>
                    <select :value="selectedItem.data.schemaStrictQueryMode || ''" @change="(e) => updateCollectionOption('schemaStrictQueryMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`strict-query-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Auto Index</label>
                    <select :value="selectedItem.data.schemaAutoIndexMode || ''" @change="(e) => updateCollectionOption('schemaAutoIndexMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`auto-index-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Auto Create</label>
                    <select :value="selectedItem.data.schemaAutoCreateMode || ''" @change="(e) => updateCollectionOption('schemaAutoCreateMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`auto-create-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">id Virtual</label>
                    <select :value="selectedItem.data.schemaIdVirtualMode || ''" @change="(e) => updateCollectionOption('schemaIdVirtualMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`id-virtual-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">_id Field</label>
                    <select :value="selectedItem.data.schemaUnderscoreIdMode || ''" @change="(e) => updateCollectionOption('schemaUnderscoreIdMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`id-field-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Minimize</label>
                    <select :value="selectedItem.data.schemaMinimizeMode || ''" @change="(e) => updateCollectionOption('schemaMinimizeMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`minimize-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Optimistic Concurrency</label>
                    <select :value="selectedItem.data.schemaOptimisticConcurrencyMode || ''" @change="(e) => updateCollectionOption('schemaOptimisticConcurrencyMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`optimistic-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Version Key</label>
                    <select :value="selectedItem.data.schemaVersionKeyMode || ''" @change="(e) => updateCollectionOption('schemaVersionKeyMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option value="">Default</option>
                        <option value="disable">Disable</option>
                        <option value="custom">Custom</option>
                    </select>
                </div>
                <div v-if="selectedItem.data.schemaVersionKeyMode === 'custom'">
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Version Key Name</label>
                    <input :value="selectedItem.data.schemaVersionKeyName || ''" @input="(e) => updateCollectionOption('schemaVersionKeyName', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="e.g. version" />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Read Preference</label>
                    <select :value="selectedItem.data.schemaReadPreference || ''" @change="(e) => updateCollectionOption('schemaReadPreference', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in readPreferenceOptions" :key="`read-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">skipVersioning</label>
                    <select :value="selectedItem.data.schemaSkipVersioningMode || ''" @change="(e) => updateCollectionOption('schemaSkipVersioningMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`skip-version-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
            </div>

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-400 uppercase">Write Concern</label>
                <div class="grid grid-cols-3 gap-2">
                    <input :value="selectedItem.data.schemaWriteConcernW || ''" @input="(e) => updateCollectionOption('schemaWriteConcernW', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="w (1/majority)" />
                    <select :value="selectedItem.data.schemaWriteConcernJMode || ''" @change="(e) => updateCollectionOption('schemaWriteConcernJMode', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`write-j-${option.value}`" :value="option.value">j: {{ option.label }}</option>
                    </select>
                    <input :value="selectedItem.data.schemaWriteConcernWtimeout || ''" @input="(e) => updateCollectionOption('schemaWriteConcernWtimeout', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="0" placeholder="wtimeout ms" />
                </div>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Capped Collection</span>
                    <button @click="updateCollectionOption('schemaCappedEnabled', !selectedItem.data.schemaCappedEnabled)" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.data.schemaCappedEnabled ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.data.schemaCappedEnabled ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                <div v-if="selectedItem.data.schemaCappedEnabled" class="grid grid-cols-3 gap-2">
                    <input :value="selectedItem.data.schemaCappedSize || ''" @input="(e) => updateCollectionOption('schemaCappedSize', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="1" placeholder="size bytes" />
                    <input :value="selectedItem.data.schemaCappedMax || ''" @input="(e) => updateCollectionOption('schemaCappedMax', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="1" placeholder="max docs" />
                    <select :value="selectedItem.data.schemaCappedAutoIndexIdMode || ''" @change="(e) => updateCollectionOption('schemaCappedAutoIndexIdMode', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`capped-id-${option.value}`" :value="option.value">autoIndexId: {{ option.label }}</option>
                    </select>
                </div>
            </div>

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-400 uppercase">Collation</label>
                <div class="grid grid-cols-2 gap-2">
                    <input :value="selectedItem.data.schemaCollationLocale || ''" @input="(e) => updateCollectionOption('schemaCollationLocale', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="locale (e.g. en)" />
                    <input :value="selectedItem.data.schemaCollationStrength || ''" @input="(e) => updateCollectionOption('schemaCollationStrength', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="1" max="5" placeholder="strength 1-5" />
                    <select :value="selectedItem.data.schemaCollationCaseLevelMode || ''" @change="(e) => updateCollectionOption('schemaCollationCaseLevelMode', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`collation-case-level-${option.value}`" :value="option.value">caseLevel: {{ option.label }}</option>
                    </select>
                    <select :value="selectedItem.data.schemaCollationCaseFirst || ''" @change="(e) => updateCollectionOption('schemaCollationCaseFirst', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in collationCaseFirstOptions" :key="`collation-case-first-${option.value}`" :value="option.value">caseFirst: {{ option.label }}</option>
                    </select>
                    <select :value="selectedItem.data.schemaCollationNumericOrderingMode || ''" @change="(e) => updateCollectionOption('schemaCollationNumericOrderingMode', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs col-span-2">
                        <option v-for="option in triStateOptions" :key="`collation-numeric-${option.value}`" :value="option.value">numericOrdering: {{ option.label }}</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="pt-4 border-t border-gray-700">
             <button @click="deleteItem" class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-900/50 rounded transition-colors text-sm">
                <Trash2 :size="16" />
                Delete {{ entityTerms.singular }}
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
                <option v-for="t in currentFieldTypes" :key="t" :value="t">{{ t }}</option>
            </select>
        </div>

        <div class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Field Options</label>

            <!-- MongoDB Specific -->
            <div v-if="activeDbType === DB_TYPES.MONGODB" class="grid grid-cols-2 gap-2">
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Required</span>
                    <button @click="toggleProp('required')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.required ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.required ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Unique</span>
                    <button @click="toggleProp('unique')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.unique ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.unique ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Index</span>
                    <button @click="toggleProp('index')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.index ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.index ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Sparse</span>
                    <button @click="toggleProp('sparse')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.sparse ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.sparse ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Immutable</span>
                    <button @click="toggleProp('immutable')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.immutable ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.immutable ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
            </div>

            <!-- SQL Specific -->
            <div v-else class="grid grid-cols-2 gap-2">
                 <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Primary Key</span>
                    <button @click="toggleProp('primaryKey')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.primaryKey ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.primaryKey ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                 <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Auto Increment</span>
                    <button @click="toggleProp('autoIncrement')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.autoIncrement ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.autoIncrement ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                 <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Nullable</span>
                    <button @click="toggleProp('nullable')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.nullable ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.nullable ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Unique</span>
                    <button @click="toggleProp('unique')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.unique ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.unique ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                 <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Index</span>
                    <button @click="toggleProp('index')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.index ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.index ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
                 <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="text-sm text-gray-300">Unsigned</span>
                    <button @click="toggleProp('unsigned')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.unsigned ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.unsigned ? 'translate-x-5' : ''"></div>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2" v-if="activeDbType === DB_TYPES.MONGODB">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Alias</label>
                    <input :value="selectedItem.alias || ''" @input="(e) => updateFieldOption('alias', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="optional alias" />
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Select</label>
                    <select :value="selectedItem.selectMode || ''" @change="(e) => updateFieldOption('selectMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in triStateOptions" :key="`field-select-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
            </div>

            <div v-else>
                 <label class="block text-[10px] text-gray-400 uppercase mb-1">Default Value</label>
                 <input :value="selectedItem.defaultValue || ''" @input="(e) => updateFieldOption('defaultValue', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="default value" />
            </div>
        </div>

        <div v-if="activeDbType !== DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">SQL Constraints</label>

            <div class="flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                <span class="text-sm text-gray-300">Foreign Key</span>
                <button @click="toggleProp('foreignKey')" class="w-10 h-5 rounded-full relative transition-colors" :class="selectedItem.foreignKey ? 'bg-emerald-500' : 'bg-gray-600'">
                    <div class="absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.foreignKey ? 'translate-x-5' : ''"></div>
                </button>
            </div>

            <div v-if="selectedItem.foreignKey" class="grid grid-cols-2 gap-2">
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Reference Table</label>
                    <select :value="selectedItem.referencesTable || ''" @change="(e) => handleReferenceTableChange(e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option value="">Select table...</option>
                        <option v-for="table in referenceTableOptions" :key="table.id" :value="table.data.label">{{ table.data.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">Reference Column</label>
                    <select :value="selectedItem.referencesColumnId || ''" @change="(e) => handleReferenceColumnChange(e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option value="">Select column...</option>
                        <option v-for="field in referenceFieldOptions" :key="field.id" :value="field.id">{{ field.name }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">FK Constraint Name</label>
                    <input :value="selectedItem.fkConstraintName || ''" @input="(e) => updateFieldOption('fkConstraintName', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="optional" />
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">On Delete</label>
                    <select :value="selectedItem.onDelete || ''" @change="(e) => updateFieldOption('onDelete', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in sqlReferentialActionOptions" :key="`on-delete-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
                <div>
                    <label class="block text-[10px] text-gray-400 uppercase mb-1">On Update</label>
                    <select :value="selectedItem.onUpdate || ''" @change="(e) => updateFieldOption('onUpdate', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                        <option v-for="option in sqlReferentialActionOptions" :key="`on-update-${option.value}`" :value="option.value">{{ option.label }}</option>
                    </select>
                </div>
            </div>

            <div class="space-y-2">
                <label class="block text-[10px] text-gray-400 uppercase mb-1">Check Constraint Expression</label>
                <input :value="selectedItem.checkExpression || ''" @input="(e) => updateFieldOption('checkExpression', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="e.g. amount > 0" />
                <input :value="selectedItem.checkConstraintName || ''" @input="(e) => updateFieldOption('checkConstraintName', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="check constraint name (optional)" />
            </div>

            <div v-if="selectedItem.index" class="space-y-1">
                <label class="block text-[10px] text-gray-400 uppercase mb-1">Index Name</label>
                <input :value="selectedItem.indexName || ''" @input="(e) => updateFieldOption('indexName', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="optional" />
            </div>
        </div>

        <div v-if="selectedItem.type === 'String' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">String Options</label>
            <div class="grid grid-cols-1 gap-2">
                <div class="min-w-0 flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="truncate text-xs text-gray-300">Trim</span>
                    <button @click="toggleProp('trim')" class="shrink-0 w-8 h-4 rounded-full relative transition-colors" :class="selectedItem.trim ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.trim ? 'translate-x-4' : ''"></div>
                    </button>
                </div>
                <div class="min-w-0 flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="truncate text-xs text-gray-300">Lowercase</span>
                    <button @click="toggleProp('lowercase')" class="shrink-0 w-8 h-4 rounded-full relative transition-colors" :class="selectedItem.lowercase ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.lowercase ? 'translate-x-4' : ''"></div>
                    </button>
                </div>
                <div class="min-w-0 flex items-center justify-between p-2 bg-[#2a2a2a] rounded">
                    <span class="truncate text-xs text-gray-300">Uppercase</span>
                    <button @click="toggleProp('uppercase')" class="shrink-0 w-8 h-4 rounded-full relative transition-colors" :class="selectedItem.uppercase ? 'bg-emerald-500' : 'bg-gray-600'">
                        <div class="absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform" :class="selectedItem.uppercase ? 'translate-x-4' : ''"></div>
                    </button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input :value="selectedItem.minLength || ''" @input="(e) => updateFieldOption('minLength', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="0" placeholder="minLength" />
                <input :value="selectedItem.maxLength || ''" @input="(e) => updateFieldOption('maxLength', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="0" placeholder="maxLength" />
            </div>
            <div class="grid grid-cols-2 gap-2">
                <input :value="selectedItem.matchPattern || ''" @input="(e) => updateFieldOption('matchPattern', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="regex pattern" />
                <input :value="selectedItem.matchFlags || ''" @input="(e) => updateFieldOption('matchFlags', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="flags (e.g. i)" />
            </div>
            <div>
                <label class="block text-[10px] text-gray-400 uppercase mb-1">Default</label>
                <input :value="selectedItem.defaultString || ''" @input="(e) => updateFieldOption('defaultString', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="default string" />
            </div>
            <div class="space-y-2">
                <div class="flex items-center justify-between">
                    <label class="block text-[10px] text-gray-400 uppercase">Enum Values</label>
                    <button @click="addEnumValue" class="px-2 py-1 text-xs rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300">Add</button>
                </div>
                <div v-for="(enumValue, enumIndex) in getEnumValues()" :key="`enum-${enumIndex}`" class="flex gap-2">
                    <input :value="enumValue" @input="(e) => updateEnumValue(enumIndex, e.target.value)" class="flex-1 bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="enum value" />
                    <button @click="removeEnumValue(enumIndex)" class="px-2 py-1 text-xs rounded bg-red-900/30 hover:bg-red-900/50 text-red-300">Remove</button>
                </div>
            </div>
        </div>

        <!-- MySQL ENUM Reuse -->
        <div v-if="selectedItem.type === 'ENUM' && activeDbType === DB_TYPES.MYSQL" class="space-y-2">
             <div class="flex items-center justify-between">
                <label class="block text-[10px] text-gray-400 uppercase">Enum Values</label>
                <button @click="addEnumValue" class="px-2 py-1 text-xs rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300">Add</button>
            </div>
            <div v-for="(enumValue, enumIndex) in getEnumValues()" :key="`enum-${enumIndex}`" class="flex gap-2">
                <input :value="enumValue" @input="(e) => updateEnumValue(enumIndex, e.target.value)" class="flex-1 bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="value" />
                <button @click="removeEnumValue(enumIndex)" class="px-2 py-1 text-xs rounded bg-red-900/30 hover:bg-red-900/50 text-red-300">Remove</button>
            </div>
        </div>

        <!-- Generic SQL Length/Params -->
        <div v-if="activeDbType !== DB_TYPES.MONGODB && ['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT'].includes(selectedItem.type)" class="space-y-2">
             <label class="block text-[10px] text-gray-400 uppercase mb-1">Length / Parameters</label>
             <input :value="selectedItem.typeParams || ''" @input="(e) => updateFieldOption('typeParams', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="e.g. 255 or 10,2" />
        </div>

        <div v-if="selectedItem.type === 'Number' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Number Options</label>
            <div class="grid grid-cols-3 gap-2">
                <input :value="selectedItem.min || ''" @input="(e) => updateFieldOption('min', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" placeholder="min" />
                <input :value="selectedItem.max || ''" @input="(e) => updateFieldOption('max', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" placeholder="max" />
                <input :value="selectedItem.defaultNumber || ''" @input="(e) => updateFieldOption('defaultNumber', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" placeholder="default" />
            </div>
        </div>

        <div v-if="selectedItem.type === 'Boolean' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Boolean Options</label>
            <div>
                <label class="block text-[10px] text-gray-400 uppercase mb-1">Default</label>
                <select :value="selectedItem.defaultBooleanMode || ''" @change="(e) => updateFieldOption('defaultBooleanMode', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                    <option v-for="option in triStateOptions" :key="`bool-default-${option.value}`" :value="option.value">{{ option.label }}</option>
                </select>
            </div>
        </div>

        <div v-if="selectedItem.type === 'Date' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Date Options</label>
            <div class="grid grid-cols-2 gap-2">
                <select :value="selectedItem.defaultDateMode || ''" @change="(e) => updateFieldOption('defaultDateMode', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                    <option value="">Default: none</option>
                    <option value="now">Default: Date.now</option>
                    <option value="custom">Default: custom date</option>
                </select>
                <input v-if="selectedItem.defaultDateMode === 'custom'" :value="selectedItem.defaultDateValue || ''" @input="(e) => updateFieldOption('defaultDateValue', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="datetime-local" />
            </div>
            <div class="grid grid-cols-3 gap-2">
                <input :value="selectedItem.minDate || ''" @input="(e) => updateFieldOption('minDate', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="datetime-local" placeholder="min date" />
                <input :value="selectedItem.maxDate || ''" @input="(e) => updateFieldOption('maxDate', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="datetime-local" placeholder="max date" />
                <input :value="selectedItem.expiresSeconds || ''" @input="(e) => updateFieldOption('expiresSeconds', e.target.value)" class="bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="number" min="0" placeholder="expires sec" />
            </div>
        </div>

        <div v-if="selectedItem.type === 'ObjectId' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">ObjectId Options</label>
            <select :value="selectedItem.ref || ''" @change="(e) => updateFieldOption('ref', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm">
                <option value="">Reference collection...</option>
                <option v-for="col in store.collections" :key="col.id" :value="col.data.label">{{ col.data.label }}</option>
            </select>
            <input :value="selectedItem.defaultObjectId || ''" @input="(e) => updateFieldOption('defaultObjectId', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs" type="text" placeholder="default objectId (optional)" />
        </div>

        <div v-if="selectedItem.type === 'Map' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Map Options</label>
            <select :value="selectedItem.mapOfType || ''" @change="(e) => updateFieldOption('mapOfType', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                <option value="">Map value type (default Mixed)</option>
                <option v-for="type in mapArrayTypeOptions" :key="`map-${type}`" :value="type">{{ type }}</option>
            </select>
        </div>

        <div v-if="selectedItem.type === 'Array' && activeDbType === DB_TYPES.MONGODB" class="space-y-3">
            <label class="block text-xs font-bold text-gray-500 uppercase">Array Options</label>
            <select :value="selectedItem.arrayOfType || ''" @change="(e) => updateFieldOption('arrayOfType', e.target.value)" class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-2 py-1 text-white text-xs">
                <option value="">Array item type (default Mixed)</option>
                <option v-for="type in mapArrayTypeOptions" :key="`arr-${type}`" :value="type">{{ type }}</option>
            </select>
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
