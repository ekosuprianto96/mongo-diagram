<script setup>
import { ref, markRaw, onMounted, onUnmounted } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useSchemaStore } from '../stores/schemaStore'
import CollectionNode from './nodes/CollectionNode.vue'
import ContextMenu from './ContextMenu.vue'

const store = useSchemaStore()
const { onConnect, addEdges, onPaneClick, onEdgeClick, onNodeContextMenu, onEdgeContextMenu, onPaneContextMenu, project } = useVueFlow()

const nodeTypes = {
  collection: markRaw(CollectionNode)
}

// Context Menu State
const menu = ref({
  visible: false,
  x: 0,
  y: 0,
  type: null,
  id: null
})

const showContextMenu = (event, type, id) => {
  event.preventDefault()
  event.stopPropagation()
  menu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    type,
    id
  }
}

const closeContextMenu = () => {
  menu.value.visible = false
}

const handleMenuAction = (action, id) => {
  if (action === 'delete') {
    if (menu.value.type === 'collection') {
      store.removeCollection(id)
    } else if (menu.value.type === 'edge') {
      store.removeEdge(id)
    }
  } else if (action === 'create') {
    const { x, y } = project({ x: menu.value.x, y: menu.value.y })
    const newId = `col-${Date.now()}`
    const newCollection = {
      id: newId,
      type: 'collection',
      position: { x, y },
      data: {
        label: 'New Collection',
        fields: [
          { id: `f-${Date.now()}-1`, name: '_id', type: 'ObjectId', key: true }
        ]
      }
    }
    store.addCollection(newCollection)
  }
  closeContextMenu()
}

onConnect((params) => {
  addEdges([params])
})


onPaneClick(() => {
  store.selectItem(null, null)
  closeContextMenu()
})

onEdgeClick((event) => {
  store.selectItem(event.edge.id, 'edge')
  closeContextMenu()
})

// Right Click Handlers
onNodeContextMenu((event) => {
  showContextMenu(event.event, 'collection', event.node.id)
})

onEdgeContextMenu((event) => {
  showContextMenu(event.event, 'edge', event.edge.id)
})

onPaneContextMenu((event) => {
    // onPaneContextMenu receives the native MouseEvent directly
    showContextMenu(event, 'canvas', null)
})

const handleKeyDown = (event) => {
    // Ignore if input/textarea is focused
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
        return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
        if (store.selectedItemId) {
            if (store.selectedItemType === 'collection') {
                store.removeCollection(store.selectedItemId)
            } else if (store.selectedItemType === 'edge') {
                store.removeEdge(store.selectedItemId)
            }
        }
    }

    if (event.ctrlKey || event.metaKey) {
        if (event.key === 'c') {
            if (store.selectedItemId && store.selectedItemType === 'collection') {
                store.copyNode(store.selectedItemId)
            }
        } else if (event.key === 'v') {
            store.pasteNode()
        }
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

</script>

<template>
  <div class="h-full w-full bg-[#1a1a1a]">
    <VueFlow
      v-model:nodes="store.collections"
      v-model:edges="store.edges"
      :node-types="nodeTypes"
      class="h-full w-full"
      :default-viewport="{ zoom: 1 }"
      :min-zoom="0.2"
      :max-zoom="4"
    >
      <Background pattern-color="#333" :gap="20" />
      <Controls />
      
      <ContextMenu 
        v-if="menu.visible" 
        :x="menu.x"
        :y="menu.y"
        :type="menu.type"
        :id="menu.id"
        @close="closeContextMenu"
        @delete="(id) => handleMenuAction('delete', id)"
        @create="() => handleMenuAction('create')"
      />
    </VueFlow>
  </div>
</template>

<style>
/* Override default Vue Flow styles for dark theme if needed */
.vue-flow__edge-path {
  stroke: #4b5563;
  stroke-width: 2;
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #10b981;
}
</style>
