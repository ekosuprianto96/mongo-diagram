<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import { Plus } from 'lucide-vue-next'
import { useSchemaStore } from '../../stores/schemaStore'

const props = defineProps({
  field: Object,
  collectionId: String,
  parentId: {
      type: String,
      default: null
  },
  index: {
      type: Number,
      default: 0
  },
  isLast: {
      type: Boolean,
      default: false
  },
  level: {
    type: Number,
    default: 0
  },
  ancestorLastFlags: {
      type: Array,
      default: () => []
  }
})

const store = useSchemaStore()

const isSelected = computed(() => store.selectedItemId === props.field.id)
const indentSize = 16
const paddingLeft = computed(() => `${props.level * indentSize + 16}px`)

const isEditing = ref(false)
const tempName = ref('')
const nameInput = ref(null)
const isDragOver = ref(false)
const isConnecting = ref(false)

const startEditing = () => {
    isEditing.value = true
    tempName.value = props.field.name
    setTimeout(() => {
        nameInput.value?.focus()
    }, 0)
}

const saveName = () => {
    if (tempName.value.trim()) {
        store.updateFieldProps(props.collectionId, props.field.id, { name: tempName.value.trim() })
    }
    isEditing.value = false
}

const selectField = () => {
  store.selectItem(props.field.id, 'field', props.collectionId)
}

const addChildField = () => {
    const newId = `f-${Date.now()}`
    store.addChildField(props.collectionId, props.field.id, {
        id: newId, 
        name: 'childField', 
        type: 'String' 
    })
    store.selectItem(newId, 'field', props.collectionId)
}

// Drag & Drop
const handleDragStart = (e) => {
    if (isConnecting.value) {
        e.preventDefault()
        return
    }

    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('application/json', JSON.stringify({
        fieldId: props.field.id,
        index: props.index,
        parentId: props.parentId,
        collectionId: props.collectionId
    }))
    e.stopPropagation()
    // Add a ghost image or just let it be
}

const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    isDragOver.value = true
}

const handleDragLeave = (e) => {
    isDragOver.value = false
}

const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    isDragOver.value = false
    try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        if (data.collectionId === props.collectionId && data.parentId === props.parentId) {
            if (data.index !== props.index) {
                store.reorderField(props.collectionId, props.parentId, data.index, props.index)
            }
        }
    } catch (err) {
        console.error('Drop error:', err)
    }
}

const startConnection = () => {
    isConnecting.value = true
}

const stopConnection = () => {
    // Delay reset slightly so browser does not start native drag from same interaction.
    requestAnimationFrame(() => {
        isConnecting.value = false
    })
}

onMounted(() => {
    window.addEventListener('mouseup', stopConnection)
    window.addEventListener('touchend', stopConnection)
})

onUnmounted(() => {
    window.removeEventListener('mouseup', stopConnection)
    window.removeEventListener('touchend', stopConnection)
})
</script>

<template>
  <div class="nodrag">
      <div 
        @click.stop="selectField"
        class="relative group/field flex items-center justify-between text-sm py-1 pr-2 rounded cursor-pointer border-2 transition-all duration-150"
        :class="[
            isSelected ? 'bg-[#2a2a2a] border-emerald-500' : 'border-transparent hover:bg-[#2a2a2a]',
            isDragOver ? 'border-t-emerald-500 bg-[#2a2a2a]/50 scale-[1.02]' : ''
        ]"
        :style="{ paddingLeft }"
        :draggable="!isConnecting"
        @dragstart="handleDragStart"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <!-- Ancestor Vertical Lines -->
        <div 
            v-for="(isLastAncestor, idx) in ancestorLastFlags" 
            :key="idx"
            v-show="!isLastAncestor"
            class="absolute top-0 bottom-0 w-px bg-[#404040]"
            :style="{ left: `${idx * indentSize + 22}px` }"
        ></div>

        <!-- Current Level L/T Shape -->
        <template v-if="level > 0">
            <!-- Vertical segment -->
            <div 
                class="absolute w-px bg-[#404040]"
                :style="{ 
                    left: `${(level - 1) * indentSize + 22}px`, 
                    top: '0', 
                    height: isLast ? '50%' : '100%' 
                }"
            ></div>
            <!-- Horizontal segment -->
            <div 
                class="absolute h-px bg-[#404040]"
                :style="{ 
                    left: `${(level - 1) * indentSize + 22}px`, 
                    top: '50%',
                    width: '8px' 
                }"
            ></div>
        </template>

        <!-- Input Handle (Target) -->
        <Handle
          type="target"
          :position="Position.Left"
          :id="field.id"
          @mousedown.stop="startConnection"
          @touchstart.stop="startConnection"
          class="!w-2 !h-2 !bg-gray-500 !-left-2.5 opacity-0 group-hover/field:opacity-100 transition-opacity"
        />

        <div class="flex items-center gap-2 flex-1 min-w-0" @dblclick.stop="startEditing">
            <span v-if="field.key" class="text-xs text-yellow-500 font-mono">PK</span>
            
            <div v-if="isEditing" class="flex-1 mr-2">
                <input 
                    ref="nameInput"
                    v-model="tempName"
                    @blur="saveName"
                    @keydown.enter="saveName"
                    @click.stop
                    class="w-full bg-[#1e1e1e] text-gray-200 font-bold px-1 py-0.5 rounded border border-emerald-500 focus:outline-none text-xs"
                />
            </div>
            <span v-else class="text-gray-200 truncate select-none">{{ field.name }}</span>
            
            <span v-if="field.required" class="text-[10px] text-red-500 font-bold">*</span>
        </div>
        
        <div class="flex items-center gap-2">
            <span class="text-xs text-gray-400 font-mono">{{ field.type }}</span>
            <button 
                v-if="field.type === 'Object' || field.type === 'Array'" 
                @click.stop="addChildField"
                class="p-0.5 rounded hover:bg-emerald-600/20 text-gray-400 hover:text-emerald-400 opacity-0 group-hover/field:opacity-100 transition-opacity"
            >
                <Plus :size="12" />
            </button>
        </div>

        <Handle
          type="source"
          :position="Position.Right"
          :id="field.id"
          @mousedown.stop="startConnection"
          @touchstart.stop="startConnection"
          class="!w-2 !h-2 !bg-emerald-500 !-right-2.5 opacity-0 group-hover/field:opacity-100 transition-opacity"
        />
      </div>

      <div v-if="field.children && field.children.length > 0" class="relative">
          <TransitionGroup name="field-list">
              <FieldItem 
                v-for="(child, idx) in field.children" 
                :key="child.id" 
                :field="child" 
                :collectionId="collectionId" 
                :parentId="field.id"
                :index="idx"
                :isLast="idx === field.children.length - 1"
                :level="level + 1"
                :ancestorLastFlags="[...ancestorLastFlags, isLast]"
              />
          </TransitionGroup>
      </div>
  </div>
</template>

<style scoped>
.field-list-move,
.field-list-enter-active,
.field-list-leave-active {
  transition: all 0.3s ease;
}

.field-list-enter-from,
.field-list-leave-to {
  opacity: 0;
  transform: translateX(10px);
}
</style>
