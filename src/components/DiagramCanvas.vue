<script setup>
import { ref, markRaw, onMounted, onUnmounted, watch, computed } from 'vue'
import { VueFlow, useVueFlow, MarkerType } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { useSchemaStore } from '../stores/schemaStore'
import CollectionNode from './nodes/CollectionNode.vue'
import ContextMenu from './ContextMenu.vue'
import { createDatabaseAdapter, getNextDefaultEntityName } from '../factories/databaseFactory'

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
  id: '#fbbf24',
  string: '#60a5fa',
  number: '#a78bfa',
  date: '#34d399',
  boolean: '#f472b6',
  json: '#67e8f9',
  binary: '#fdba74',
  enum: '#e879f9',
  default: '#64748b',
}
const DEFAULT_EDGE_COLOR = '#64748b'
const RELATION_TYPES = {
  ONE_TO_ONE: 'one_to_one',
  ONE_TO_MANY: 'one_to_many',
  MANY_TO_MANY: 'many_to_many',
}

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

const resolveFieldTypeColor = (fieldType) => {
  const type = String(fieldType || '').trim().toUpperCase()

  const numberTypes = new Set([
    'NUMBER', 'INT', 'INTEGER', 'BIGINT', 'TINYINT', 'SMALLINT',
    'DECIMAL', 'FLOAT', 'DOUBLE', 'REAL', 'DOUBLE PRECISION',
    'SERIAL', 'BIGSERIAL',
  ])
  const stringTypes = new Set(['STRING', 'VARCHAR', 'TEXT', 'CHAR', 'LONGTEXT'])
  const dateTypes = new Set(['DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR', 'INTERVAL'])
  const boolTypes = new Set(['BOOLEAN'])
  const jsonTypes = new Set(['ARRAY', 'OBJECT', 'MAP', 'MIXED', 'JSON', 'JSONB', 'XML'])
  const binaryTypes = new Set(['BUFFER', 'BLOB', 'BYTEA'])
  const idTypes = new Set(['OBJECTID', 'UUID'])
  const enumTypes = new Set(['ENUM'])

  if (idTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.id
  if (stringTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.string
  if (numberTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.number
  if (dateTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.date
  if (boolTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.boolean
  if (jsonTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.json
  if (binaryTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.binary
  if (enumTypes.has(type)) return FIELD_TYPE_EDGE_COLORS.enum
  return FIELD_TYPE_EDGE_COLORS.default
}

const hasFieldHandleInCollection = (collectionId, fieldId) => {
  if (!fieldId) return false
  return Boolean(getFieldTypeFromHandle(collectionId, fieldId))
}

const buildEdgeVisualByType = (edge) => {
  const fieldType = getFieldTypeFromHandle(edge.source, edge.sourceHandle)
  const baseColor = resolveFieldTypeColor(fieldType) || DEFAULT_EDGE_COLOR
  const relationType = edge.relationType || RELATION_TYPES.ONE_TO_MANY

  if (relationType === RELATION_TYPES.ONE_TO_ONE) {
    return {
      label: '1-1',
      style: { stroke: baseColor, strokeWidth: 2, strokeDasharray: '0' },
      markerStart: { type: MarkerType.Arrow, color: baseColor, width: 14, height: 14 },
      markerEnd: { type: MarkerType.Arrow, color: baseColor, width: 14, height: 14 },
    }
  }

  if (relationType === RELATION_TYPES.MANY_TO_MANY) {
    return {
      label: 'N-N',
      style: { stroke: baseColor, strokeWidth: 2, strokeDasharray: '3 3' },
      markerStart: { type: MarkerType.ArrowClosed, color: baseColor, width: 18, height: 18 },
      markerEnd: { type: MarkerType.ArrowClosed, color: baseColor, width: 18, height: 18 },
    }
  }

  return {
    label: '1-N',
    style: { stroke: baseColor, strokeWidth: 2, strokeDasharray: '6 4' },
    markerStart: { type: MarkerType.Arrow, color: baseColor, width: 14, height: 14 },
    markerEnd: { type: MarkerType.ArrowClosed, color: baseColor, width: 18, height: 18 },
  }
}

const syncEdgeStylesByFieldType = () => {
  store.edges.forEach((edge) => {
    const visual = buildEdgeVisualByType(edge)
    const desiredStyle = visual.style
    const currentStyle = edge.style || {}

    const styleChanged =
      currentStyle.stroke !== desiredStyle.stroke ||
      currentStyle.strokeWidth !== desiredStyle.strokeWidth ||
      currentStyle.strokeDasharray !== desiredStyle.strokeDasharray

    if (styleChanged) {
      edge.style = { ...currentStyle, ...desiredStyle }
    }

    if (edge.label !== visual.label) {
      edge.label = visual.label
    }
    if (edge.labelStyle?.color !== '#e5e7eb' || edge.labelStyle?.fontSize !== 11 || edge.labelStyle?.fontWeight !== 700) {
      edge.labelStyle = { color: '#e5e7eb', fontSize: 11, fontWeight: 700 }
    }
    if (edge.labelBgStyle?.fill !== '#1f2937' || edge.labelBgStyle?.fillOpacity !== 0.95) {
      edge.labelBgStyle = { fill: '#1f2937', fillOpacity: 0.95 }
    }
    if (edge.labelBgPadding?.[0] !== 4 || edge.labelBgPadding?.[1] !== 2) {
      edge.labelBgPadding = [4, 2]
    }

    const markerStartType = edge.markerStart?.type || null
    const markerEndType = edge.markerEnd?.type || null
    if (visual.markerStart) {
      if (
        markerStartType !== visual.markerStart.type ||
        edge.markerStart?.color !== visual.markerStart.color
      ) {
        edge.markerStart = visual.markerStart
      }
    } else if (edge.markerStart) {
      edge.markerStart = undefined
    }

    if (
      markerEndType !== visual.markerEnd.type ||
      edge.markerEnd?.color !== visual.markerEnd.color
    ) {
      edge.markerEnd = visual.markerEnd
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
const lastEdgeClick = ref({ id: null, ts: 0 })

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
    const adapter = createDatabaseAdapter(store.activeDatabaseType)
    const defaultField = { ...adapter.getDefaultField(), id: `f-${Date.now()}-1` }
    const nextEntityName = getNextDefaultEntityName(
      store.activeDatabaseType,
      store.activeCollections.map((collection) => collection?.data?.label)
    )
    const newCollection = {
      id: newId,
      type: 'collection',
      position: { x, y },
      data: {
        label: nextEntityName,
        fields: [defaultField]
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

  addEdges([{
    ...params,
    databaseId: store.activeDatabaseId,
    relationType: RELATION_TYPES.ONE_TO_MANY,
    onDelete: '',
    onUpdate: '',
    constraintName: '',
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

  const now = Date.now()
  const isDoubleClick = lastEdgeClick.value.id === event.edge.id && now - lastEdgeClick.value.ts < 320
  lastEdgeClick.value = { id: event.edge.id, ts: now }

  if (isDoubleClick) {
    const currentType = event.edge.relationType || RELATION_TYPES.ONE_TO_MANY
    const nextType = currentType === RELATION_TYPES.ONE_TO_MANY
      ? RELATION_TYPES.ONE_TO_ONE
      : currentType === RELATION_TYPES.ONE_TO_ONE
        ? RELATION_TYPES.MANY_TO_MANY
        : RELATION_TYPES.ONE_TO_MANY
    store.updateEdgeProps(event.edge.id, { relationType: nextType })
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
  if (store.selectedItemType === 'field') {
    const fieldCollectionStillExists = store.activeCollections.some(
      (collection) => collection.id === store.selectedCollectionId
    )
    if (fieldCollectionStillExists) {
      return
    }
    store.selectItem(null, null, null)
    return
  }

  const totalSelected = nodes.length + edges.length

  if (totalSelected !== 1) {
    store.selectItem(null, null, null)
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
  
  // Persist layout changes to backend (debounced)
  if (store.bridgeMode === 'remote') {
    store.saveLayout()
  }
}, { deep: true })

watch(() => store.edges, () => {
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
  <div class="relative h-full w-full bg-[#1a1a1a]">
    <div class="absolute bottom-4 left-4 z-20 w-52 rounded-lg border border-gray-700 bg-[#1e1e1e]/90 p-3 backdrop-blur">
      <p class="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Relationship Legend</p>
      <div class="space-y-1.5 text-xs text-gray-300">
        <div class="flex items-center gap-2">
          <span class="inline-block h-px w-8 bg-gray-300"></span>
          <span>1-1</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block h-px w-8 border-t border-dashed border-gray-300"></span>
          <span>1-N</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="inline-block h-px w-8 border-t border-dotted border-gray-300"></span>
          <span>N-N</span>
        </div>
      </div>
    </div>
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
