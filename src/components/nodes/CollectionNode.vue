<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { MoreVertical, Plus, Database } from 'lucide-vue-next'
import { useSchemaStore } from '../../stores/schemaStore'
import FieldItem from './FieldItem.vue'

const props = defineProps({
  data: {
    type: Object,
    required: true
  },
  id: {
    type: String,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const store = useSchemaStore()
const { updateNodeInternals, findNode, addSelectedNodes, removeSelectedNodes } = useVueFlow()
const isEditing = ref(false)
const tempLabel = ref('')
const titleInput = ref(null)
let syncRaf = null

const startEditing = () => {
    isEditing.value = true
    tempLabel.value = props.data.label
    setTimeout(() => {
        titleInput.value?.focus()
    }, 0)
}

const saveTitle = () => {
    if (tempLabel.value.trim()) {
        store.updateCollectionProps(props.id, { label: tempLabel.value.trim() })
    }
    isEditing.value = false
}

const syncNodeSelectionFromStore = () => {
    const selectedIds = new Set(
        store.activeCollections
            .filter((collection) => collection.selected)
            .map((collection) => collection.id)
    )

    const nodesToSelect = []
    const nodesToUnselect = []

    store.activeCollections.forEach((collection) => {
        const node = findNode(collection.id)
        if (!node) return

        if (selectedIds.has(collection.id)) {
            if (!node.selected) nodesToSelect.push(node)
            return
        }

        if (node.selected) nodesToUnselect.push(node)
    })

    if (nodesToUnselect.length > 0) {
        removeSelectedNodes(nodesToUnselect)
    }
    if (nodesToSelect.length > 0) {
        addSelectedNodes(nodesToSelect)
    }
}

const selectCollection = (event) => {
    const isMultiSelect = event.shiftKey || event.metaKey || event.ctrlKey
    const node = findNode(props.id)
    if (!node) return

    if (isMultiSelect) {
        const selectedCount = store.activeCollections.filter((collection) => collection.selected).length
        const alreadySelected = Boolean(
            store.activeCollections.find((collection) => collection.id === props.id)?.selected
        )

        if (alreadySelected && selectedCount === 1) {
            store.selectItem(props.id, 'collection')
            syncNodeSelectionFromStore()
            return
        }
        store.setCollectionSelection(props.id, true)
        syncNodeSelectionFromStore()
        return
    }

    store.setCollectionSelection(props.id, false)
    syncNodeSelectionFromStore()
}

const addField = () => {
    const newId = `f-${Date.now()}`
    store.addField(props.id, { 
        id: newId, 
        name: 'newField', 
        type: 'String' 
    })
    store.selectItem(newId, 'field', props.id)
}

const syncEdgesDuringFieldAnimation = () => {
  if (syncRaf) {
    cancelAnimationFrame(syncRaf)
    syncRaf = null
  }

  const duration = 180
  const start = performance.now()

  const tick = () => {
    updateNodeInternals([props.id])
    if (performance.now() - start < duration) {
      syncRaf = requestAnimationFrame(tick)
    } else {
      syncRaf = null
    }
  }

  syncRaf = requestAnimationFrame(tick)
}

watch(
  () => props.data.fields,
  async () => {
    await nextTick()
    syncEdgesDuringFieldAnimation()
  },
  { deep: true }
)

onUnmounted(() => {
  if (syncRaf) cancelAnimationFrame(syncRaf)
})
</script>

<template>
  <div 
    @click.stop="selectCollection"
    class="min-w-[276px] bg-gradient-to-b from-[#1f1f23] to-[#17171a] rounded-xl border shadow-[0_8px_28px_rgba(0,0,0,0.35)] overflow-hidden transition-all duration-200 group"
    :class="selected || (store.selectedItemId === id && store.selectedItemType === 'collection') ? 'border-emerald-400 ring-1 ring-emerald-400/90 shadow-[0_8px_28px_rgba(16,185,129,0.16)]' : 'border-gray-700/90 hover:border-gray-500'"
  >
    <div class="h-0.5 bg-gradient-to-r from-emerald-400/80 via-cyan-400/70 to-blue-400/60"></div>

    <!-- Header -->
    <div 
      class="px-3 py-2 bg-[#27272d] border-b border-gray-700/80 flex justify-between items-center handle drag-handle cursor-grab active:cursor-grabbing"
      @dblclick.stop="startEditing"
    >
      <div class="flex items-center gap-2 min-w-0 flex-1 mr-2">
        <div class="w-6 h-6 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Database :size="13" />
        </div>

        <div v-if="isEditing" class="flex-1 min-w-0">
        <input 
          ref="titleInput"
          v-model="tempLabel"
          @blur="saveTitle"
          @keydown.enter="saveTitle"
          class="w-full bg-[#1e1e1e] text-emerald-300 font-bold px-2 py-1 rounded border border-emerald-500 focus:outline-none text-sm"
        />
      </div>
        <div v-else class="min-w-0 flex-1">
          <span class="font-bold text-emerald-300 truncate block leading-tight select-none">{{ data.label }}</span>
          <span class="text-[10px] text-gray-500">{{ data.fields.length }} fields</span>
        </div>
      </div>
      
      <div class="flex gap-1" v-if="!isEditing">
        <button class="p-1 rounded text-gray-500 hover:text-white hover:bg-gray-700/70 transition-colors">
          <MoreVertical :size="14" />
        </button>
      </div>
    </div>

    <div class="px-2.5 py-2.5 space-y-1.5 nodrag bg-[#1a1a1f]">
      <TransitionGroup name="field-list">
        <FieldItem 
          v-for="(field, index) in data.fields" 
          :key="field.id" 
          :field="field" 
          :collectionId="id" 
          :parentId="null"
          :index="index"
          :isLast="index === data.fields.length - 1"
          :level="0"
        />
      </TransitionGroup>
    </div>

    <!-- Footer -->
    <div class="p-2 border-t border-gray-700/80 bg-[#212127]">
      <button @click.stop="addField" class="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-gray-300 hover:text-emerald-200 bg-[#2a2a33] hover:bg-[#30303a] border border-gray-600/60 rounded-md transition-colors">
        <Plus :size="14" />
        Add Field
      </button>
    </div>
  </div>
</template>

<style scoped>
.field-list-move,
.field-list-enter-active,
.field-list-leave-active {
  transition: all 0.15s ease-out;
}

.field-list-enter-from,
.field-list-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
