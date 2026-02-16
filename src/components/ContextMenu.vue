<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { Trash2, Copy, X } from 'lucide-vue-next'

const props = defineProps({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  type: { type: String, required: true }, // 'node', 'edge', 'pane'
  id: { type: String, default: null }
})

const emit = defineEmits(['close', 'delete', 'duplicate'])

const menuRef = ref(null)

const handleClickOutside = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    emit('close')
  }
}

onMounted(() => {
  console.log('[ContextMenu] Component Mounted')
  // Delay adding listeners to avoid catching the initial click/contextmenu event
  setTimeout(() => {
    console.log('[ContextMenu] Adding global listeners')
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('contextmenu', handleClickOutside)
  }, 100)
})

onUnmounted(() => {
  console.log('[ContextMenu] Component Unmounted')
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('contextmenu', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div 
      v-if="true"
      ref="menuRef"
      class="fixed z-[9999] bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-xl py-1 w-48 text-sm"
      :style="{ top: `${y}px`, left: `${x}px` }"
    >
      <div v-if="type === 'collection'" class="px-2 py-1 text-xs font-bold text-gray-500 uppercase border-b border-gray-700 mb-1">
        Collection Actions
      </div>
      <div v-else-if="type === 'edge'" class="px-2 py-1 text-xs font-bold text-gray-500 uppercase border-b border-gray-700 mb-1">
        Relation Actions
      </div>
      <div v-else-if="type === 'canvas'" class="px-2 py-1 text-xs font-bold text-gray-500 uppercase border-b border-gray-700 mb-1">
        Canvas Actions
      </div>

      <!-- Actions -->
      <button 
        v-if="type === 'canvas'"
        @click="$emit('create')" 
        class="w-full text-left px-3 py-2 hover:bg-[#2a2a2a] text-emerald-400 hover:text-emerald-300 flex items-center gap-2 transition-colors"
      >
        <Copy :size="14" />
        Create Collection
      </button>

      <button 
        v-if="type !== 'canvas'"
        @click="$emit('delete', id)" 
        class="w-full text-left px-3 py-2 hover:bg-red-900/30 text-red-400 hover:text-red-300 flex items-center gap-2 transition-colors"
      >
        <Trash2 :size="14" />
        Delete
      </button>
      
      <!-- Future: Duplicate -->
      <!-- <button 
        v-if="type === 'collection'"
        @click="$emit('duplicate', id)" 
        class="w-full text-left px-3 py-2 hover:bg-[#2a2a2a] text-gray-300 hover:text-white flex items-center gap-2 transition-colors"
      >
        <Copy :size="14" />
        Duplicate
      </button> -->
    </div>
  </Teleport>
</template>
