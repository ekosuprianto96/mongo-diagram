<script setup>
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { DB_TYPES } from '../constants/dbTypes'

const props = defineProps({
    isOpen: Boolean
})

const emit = defineEmits(['close', 'create'])

const dbName = ref('New Database')
const dbType = ref(DB_TYPES.MONGODB)

const handleCreate = () => {
    if (!dbName.value.trim()) return
    emit('create', { name: dbName.value, type: dbType.value })
    dbName.value = 'New Database'
    dbType.value = DB_TYPES.MONGODB
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-[#1e1e1e] border border-gray-700 rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-700 flex justify-between items-center bg-[#252525]">
        <h2 class="text-xl font-bold text-white">Create Database</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white transition-colors">
          <X :size="20" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-4">
          <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Database Name</label>
              <input 
                  v-model="dbName"
                  type="text" 
                  class="w-full bg-[#2a2a2a] border border-gray-600 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                  placeholder="Enter database name"
                  @keyup.enter="handleCreate"
              />
          </div>

          <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">Database Type</label>
              <div class="grid grid-cols-1 gap-2">
                  <label 
                      v-for="type in Object.values(DB_TYPES)" 
                      :key="type"
                      class="flex items-center gap-3 p-3 rounded border cursor-pointer hover:bg-[#2a2a2a] transition-all"
                      :class="dbType === type ? 'border-emerald-500 bg-[#2a2a2a]' : 'border-gray-700 bg-[#1e1e1e]'"
                  >
                      <input 
                          type="radio" 
                          name="dbType" 
                          :value="type" 
                          v-model="dbType"
                          class="text-emerald-500 focus:ring-emerald-500 bg-gray-700 border-gray-600"
                      />
                      <span class="text-white text-sm">{{ type }}</span>
                  </label>
              </div>
          </div>
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t border-gray-700 bg-[#252525] flex justify-end gap-3">
        <button @click="$emit('close')" class="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white font-medium transition-colors text-sm">
            Cancel
        </button>
        <button @click="handleCreate" class="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors text-sm">
            Create Database
        </button>
      </div>
    </div>
  </div>
</template>
