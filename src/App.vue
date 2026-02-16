<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import DiagramCanvas from './components/DiagramCanvas.vue'
import CodeExport from './components/CodeExport.vue'
import PropertiesPanel from './components/PropertiesPanel.vue'
import { Sparkles, Download, Share2 } from 'lucide-vue-next'

const isExportOpen = ref(false)
const exportCollectionId = ref(null)

const handleAiAnalysis = () => {
  alert("AI Assistant: Analysis complete! Your schema looks good. Consider indexing 'email' field in Users collection.")
}

const openExportGlobal = () => {
    exportCollectionId.value = null
    isExportOpen.value = true
}

const openExportForCollection = (id) => {
    exportCollectionId.value = id
    isExportOpen.value = true
}
</script>

<template>
  <div class="flex h-screen w-screen overflow-hidden bg-[#1a1a1a] text-white font-sans antialiased">
    <Sidebar @export-collection="openExportForCollection" />
    <main class="flex-1 h-full w-full relative flex">
      <div class="flex-1 relative h-full">
        <DiagramCanvas />
        
        <!-- Floating Toolbar -->
        <div class="absolute top-4 right-4 bg-[#1e1e1e]/90 backdrop-blur border border-gray-700 rounded-lg shadow-2xl p-2 flex gap-2 z-10">
            <button @click="handleAiAnalysis" class="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded text-sm font-medium transition-all shadow-lg shadow-purple-900/20">
                <Sparkles :size="16" />
                AI Analyze
            </button>
            <div class="w-px bg-gray-700 mx-1"></div>
            <button @click="openExportGlobal" class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/50">
                <Download :size="16" />
                Export
            </button>
            <button class="flex items-center gap-2 px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-300 hover:text-white rounded text-sm font-medium transition-colors border border-gray-600/50">
                <Share2 :size="16" />
                Share
            </button>
        </div>
      </div>

      <PropertiesPanel />

      <CodeExport 
        :isOpen="isExportOpen" 
        :collectionId="exportCollectionId"
        @close="isExportOpen = false" 
      />
    </main>
  </div>
</template>
