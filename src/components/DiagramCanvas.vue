<script setup>
import { ref, markRaw, onMounted, onUnmounted, watch, computed } from 'vue'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useSchemaStore } from '../stores/schemaStore'
import CollectionNode from './nodes/CollectionNode.vue'
import ContextMenu from './ContextMenu.vue'

const store = useSchemaStore()
const {
  onConnect,
  addEdges,
  onPaneClick,
  onEdgeClick,
  onNodeContextMenu,
  onEdgeContextMenu,
  onPaneContextMenu,
  project,
  getSelectedNodes,
  getSelectedEdges,
  findEdge,
  addSelectedEdges,
  removeSelectedEdges,
} = useVueFlow()

const nodeTypes = {
  collection: markRaw(CollectionNode)
}

const activeNodesModel = computed({
  get: () => store.activeCollections,
  set: (nodes) => {
    const dbId = store.activeDatabaseId
    const otherNodes = store.collections.filter((node) => node.databaseId !== dbId)
    const currentNodes = (nodes || []).map((node) => (
      node?.databaseId === dbId ? node : { ...node, databaseId: dbId }
    ))
    store.collections = [...otherNodes, ...currentNodes]
  },
})

const sanitizeEdgesForActiveDatabase = (edges = []) => {
  const dbId = store.activeDatabaseId
  const activeCollectionIds = new Set(store.activeCollections.map((collection) => collection.id))

  return (edges || [])
    .filter((edge) => edge && edge.source && edge.target && edge.sourceHandle && edge.targetHandle)
    .filter((edge) => activeCollectionIds.has(edge.source) && activeCollectionIds.has(edge.target))
    .filter((edge) => hasFieldHandleInCollection(edge.source, edge.sourceHandle))
    .filter((edge) => hasFieldHandleInCollection(edge.target, edge.targetHandle))
    .map((edge) => (edge?.databaseId === dbId ? edge : { ...edge, databaseId: dbId }))
}

const activeEdgesModel = computed({
  get: () => store.activeEdges,
  set: (edges) => {
    const dbId = store.activeDatabaseId
    const otherEdges = store.edges.filter((edge) => edge.databaseId !== dbId)
    const currentEdges = sanitizeEdgesForActiveDatabase(edges)
    store.edges = [...otherEdges, ...currentEdges]
  },
})

const FIELD_TYPE_EDGE_COLORS = {
  ObjectId: '#fbbf24',
  String: '#60a5fa',
  Number: '#a78bfa',
  Date: '#34d399',
  Boolean: '#f472b6',
  Array: '#cbd5e1',
  Object: '#67e8f9',
  Map: '#818cf8',
  Buffer: '#fdba74',
  Mixed: '#9ca3af',
}
const DEFAULT_EDGE_COLOR = '#64748b'

const findFieldRecursively = (fields, fieldId) => {
  for (const field of fields || []) {
    if (field.id === fieldId) return field
    if (field.children?.length) {
      const child = findFieldRecursively(field.children, fieldId)
      if (child) return child
    }
  }
  return null
}

const getFieldTypeFromHandle = (collectionId, fieldId) => {
  const collection = store.collections.find((item) => item.id === collectionId)
  if (!collection || !fieldId) return null
  const field = findFieldRecursively(collection.data?.fields || [], fieldId)
  return field?.type || null
}

const hasFieldHandleInCollection = (collectionId, fieldId) => {
  if (!fieldId) return false
  return Boolean(getFieldTypeFromHandle(collectionId, fieldId))
}

const buildEdgeStyleByFieldType = (fieldType) => ({
  stroke: FIELD_TYPE_EDGE_COLORS[fieldType] || DEFAULT_EDGE_COLOR,
  strokeWidth: 2,
  strokeDasharray: '7 5',
})

const syncEdgeStylesByFieldType = () => {
  store.edges.forEach((edge) => {
    const fieldType = getFieldTypeFromHandle(edge.source, edge.sourceHandle)
    const desiredStyle = buildEdgeStyleByFieldType(fieldType)
    const currentStyle = edge.style || {}

    const styleChanged =
      currentStyle.stroke !== desiredStyle.stroke ||
      currentStyle.strokeWidth !== desiredStyle.strokeWidth ||
      currentStyle.strokeDasharray !== desiredStyle.strokeDasharray

    if (styleChanged) {
      edge.style = { ...currentStyle, ...desiredStyle }
    }

    if (edge.animated !== false) {
      edge.animated = false
    }
  })
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
  if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return
  if (!hasFieldHandleInCollection(params.source, params.sourceHandle)) return
  if (!hasFieldHandleInCollection(params.target, params.targetHandle)) return

  const fieldType = getFieldTypeFromHandle(params.source, params.sourceHandle)
  addEdges([{
    ...params,
    databaseId: store.activeDatabaseId,
    style: buildEdgeStyleByFieldType(fieldType),
    animated: false,
  }])
})


onPaneClick(() => {
  store.clearSelections()
  closeContextMenu()
})

onEdgeClick((event) => {
  const isMultiSelect = event.event.shiftKey || event.event.metaKey || event.event.ctrlKey

  if (isMultiSelect) {
    const edge = findEdge(event.edge.id)
    if (edge) {
      const isSelected = getSelectedEdges.value.some((selectedEdge) => selectedEdge.id === edge.id)
      const selectedCount = getSelectedEdges.value.length

      if (isSelected && selectedCount === 1) {
        store.selectItem(edge.id, 'edge')
        closeContextMenu()
        return
      }

      if (isSelected) {
        removeSelectedEdges([edge])
      } else {
        addSelectedEdges([edge])
      }
    }
    closeContextMenu()
    return
  }

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

watch([getSelectedNodes, getSelectedEdges], ([nodes, edges]) => {
  const totalSelected = nodes.length + edges.length

  if (totalSelected !== 1) {
    if (store.selectedItemType !== 'field') {
      store.selectItem(null, null, null)
    }
    return
  }

  if (nodes.length === 1) {
    store.selectItem(nodes[0].id, 'collection')
    return
  }

  if (edges.length === 1) {
    store.selectItem(edges[0].id, 'edge')
  }
}, { deep: true })

watch(() => store.collections, () => {
  store.pruneInvalidEdges(store.activeDatabaseId)
  syncEdgeStylesByFieldType()
}, { deep: true })

const handleKeyDown = (event) => {
    // Ignore if input/textarea is focused
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) || document.activeElement.isContentEditable) {
        return
    }

    if (event.key === 'Delete' || event.key === 'Backspace') {
        const selectedNodeIds = getSelectedNodes.value.map((node) => node.id)
        const selectedEdgeIds = getSelectedEdges.value.map((edge) => edge.id)

        if (selectedNodeIds.length || selectedEdgeIds.length) {
            selectedNodeIds.forEach((id) => store.removeCollection(id))
            selectedEdgeIds.forEach((id) => store.removeEdge(id))
            return
        }

        if (store.selectedItemId) {
            if (store.selectedItemType === 'collection') {
                store.removeCollection(store.selectedItemId)
            } else if (store.selectedItemType === 'edge') {
                store.removeEdge(store.selectedItemId)
            }
        }
    }

    if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase()

        if (key === 'z') {
            event.preventDefault()
            if (event.shiftKey) {
                store.redo()
            } else {
                store.undo()
            }
            return
        }

        if (key === 'y') {
            event.preventDefault()
            store.redo()
            return
        }

        if (key === 'c') {
            if (store.selectedItemId && store.selectedItemType === 'collection') {
                store.copyNode(store.selectedItemId)
            }
        } else if (key === 'v') {
            store.pasteNode()
        }
    }
}

onMounted(() => {
    store.pruneInvalidEdges(store.activeDatabaseId)
    syncEdgeStylesByFieldType()
    window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
})

</script>

<template>
  <div class="h-full w-full bg-[#1a1a1a]">
    <VueFlow
      :key="store.activeDatabaseId"
      v-model:nodes="activeNodesModel"
      v-model:edges="activeEdgesModel"
      :node-types="nodeTypes"
      :multi-selection-key-code="['Meta', 'Control', 'Shift']"
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
  stroke-width: 2;
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke-width: 2.5;
}
</style>
