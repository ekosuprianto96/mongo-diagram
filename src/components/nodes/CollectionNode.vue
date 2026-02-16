<script setup>
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { useVueFlow } from '@vue-flow/core'
import { MoreVertical, Plus } from 'lucide-vue-next'
import { useSchemaStore } from '../../stores/schemaStore'
import FieldItem from './FieldItem.vue'

const props = defineProps(['data', 'id'])
const emit = defineEmits(['update-node'])

const store = useSchemaStore()
const { updateNodeInternals } = useVueFlow()
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

const selectCollection = () => {
    store.selectItem(props.id, 'collection')
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
    class="min-w-[200px] bg-[#1e1e1e] rounded-lg border shadow-xl overflow-hidden transition-all duration-200 group"
    :class="store.selectedItemId === id && store.selectedItemType === 'collection' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-700 hover:border-gray-600'"
  >
    <!-- Header -->
    <div 
      class="px-4 py-2 bg-[#2d2d2d] border-b border-gray-700 flex justify-between items-center handle drag-handle cursor-grab active:cursor-grabbing"
      @dblclick.stop="startEditing"
    >
      <div v-if="isEditing" class="flex-1 mr-2">
        <input 
          ref="titleInput"
          v-model="tempLabel"
          @blur="saveTitle"
          @keydown.enter="saveTitle"
          class="w-full bg-[#1e1e1e] text-emerald-400 font-bold px-1 py-0.5 rounded border border-emerald-500 focus:outline-none text-sm"
        />
      </div>
      <span v-else class="font-bold text-emerald-400 truncate flex-1 select-none">{{ data.label }}</span>
      
      <div class="flex gap-1" v-if="!isEditing">
        <button class="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white">
          <MoreVertical :size="14" />
        </button>
      </div>
    </div>

    <div class="p-2 space-y-1 nodrag">
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
    <div class="p-2 border-t border-gray-700 bg-[#252525]">
      <button @click.stop="addField" class="w-full flex items-center justify-center gap-1 py-1 text-xs font-medium text-gray-400 hover:text-emerald-400 hover:bg-[#2a2a2a] rounded transition-colors">
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
