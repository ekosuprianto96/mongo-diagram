import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { useUiStore } from './uiStore'

const STORAGE_KEY = 'mongo-architect-schema'
let hasShownStorageFullAlert = false

const persistProjectState = (state) => {
    if (typeof window === 'undefined') return

    const payload = {
        databases: state.databases,
        activeDatabaseId: state.activeDatabaseId,
        collections: state.collections,
        edges: state.edges,
        selectedItemId: state.selectedItemId,
        selectedItemType: state.selectedItemType,
        selectedCollectionId: state.selectedCollectionId,
        clipboard: state.clipboard,
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
        return { ok: true }
    } catch (error) {
        return { ok: false, error }
    }
}

const isQuotaExceededError = (error) => {
    if (!error) return false
    if (error?.name === 'QuotaExceededError') return true
    if (error?.code === 22 || error?.code === 1014) return true
    const msg = String(error?.message || '').toLowerCase()
    return msg.includes('quota') || msg.includes('storage')
}

const toPositiveInt = (value, fallback) => {
    const parsed = Number.parseInt(value ?? '', 10)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const HISTORY_MAX_SIZE = toPositiveInt(import.meta.env.VITE_HISTORY_MAX_SIZE, 100)
const HISTORY_RETENTION_MS = toPositiveInt(import.meta.env.VITE_HISTORY_RETENTION_MS, 1000 * 60 * 10)
const historyState = {
    past: [],
    future: [],
    isRestoring: false,
}

const pruneHistory = (entries) => {
    const cutoff = Date.now() - HISTORY_RETENTION_MS
    return entries.filter((entry) => entry.createdAt >= cutoff)
}

const findFieldRecursively = (fields, id) => {
    for (const field of fields) {
        if (field.id === id) return { field, list: fields }
        if (field.children && field.children.length > 0) {
            const result = findFieldRecursively(field.children, id)
            if (result) return result
        }
    }
    return null
}

const fieldExistsInCollection = (collection, fieldId) => {
    if (!collection || !fieldId) return false
    return Boolean(findFieldRecursively(collection.data?.fields || [], fieldId))
}

const toCode = (value) => {
    if (value && typeof value === 'object' && value.__raw) {
        return value.__raw
    }

    if (Array.isArray(value)) {
        return `[${value.map((item) => toCode(item)).join(', ')}]`
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value).map(([key, val]) => `${key}: ${toCode(val)}`)
        return `{ ${entries.join(', ')} }`
    }

    return JSON.stringify(value)
}

const typeToSchemaCode = (type) => {
    return type === 'ObjectId' ? 'Schema.Types.ObjectId' : type
}

const parseTriStateBoolean = (value) => {
    if (value === true || value === false) return value
    if (value === 'true') return true
    if (value === 'false') return false
    return undefined
}

const parseOptionalNumber = (value) => {
    if (value === '' || value === null || value === undefined) return undefined
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
}

const buildFieldOptionEntries = (field) => {
    const options = []

    options.push(`type: ${typeToSchemaCode(field.type)}`)

    if (field.ref && field.type === 'ObjectId') options.push(`ref: ${JSON.stringify(field.ref)}`)
    if (field.required) options.push('required: true')
    if (field.unique) options.push('unique: true')
    if (field.index) options.push('index: true')
    if (field.sparse) options.push('sparse: true')
    if (field.immutable) options.push('immutable: true')

    if (typeof field.alias === 'string' && field.alias.trim()) {
        options.push(`alias: ${JSON.stringify(field.alias.trim())}`)
    }

    const selectMode = parseTriStateBoolean(field.selectMode)
    if (typeof selectMode === 'boolean') {
        options.push(`select: ${selectMode}`)
    }

    if (field.type === 'String') {
        if (field.trim) options.push('trim: true')
        if (field.lowercase) options.push('lowercase: true')
        if (field.uppercase) options.push('uppercase: true')

        const minLength = parseOptionalNumber(field.minLength)
        if (typeof minLength === 'number' && minLength >= 0) options.push(`minLength: ${minLength}`)

        const maxLength = parseOptionalNumber(field.maxLength)
        if (typeof maxLength === 'number' && maxLength >= 0) options.push(`maxLength: ${maxLength}`)

        const matchPattern = String(field.matchPattern || '').trim()
        if (matchPattern) {
            const flags = String(field.matchFlags || '')
            options.push(`match: new RegExp(${JSON.stringify(matchPattern)}, ${JSON.stringify(flags)})`)
        }

        const enumValues = Array.isArray(field.enumValues)
            ? field.enumValues.filter((value) => String(value).trim().length > 0).map((value) => String(value).trim())
            : []
        if (enumValues.length > 0) options.push(`enum: ${toCode(enumValues)}`)

        const defaultString = String(field.defaultString ?? '').trim()
        if (defaultString) options.push(`default: ${JSON.stringify(defaultString)}`)
    }

    if (field.type === 'Number') {
        const min = parseOptionalNumber(field.min)
        if (typeof min === 'number') options.push(`min: ${min}`)

        const max = parseOptionalNumber(field.max)
        if (typeof max === 'number') options.push(`max: ${max}`)

        const defaultNumber = parseOptionalNumber(field.defaultNumber)
        if (typeof defaultNumber === 'number') options.push(`default: ${defaultNumber}`)
    }

    if (field.type === 'Boolean') {
        const defaultBoolean = parseTriStateBoolean(field.defaultBooleanMode)
        if (typeof defaultBoolean === 'boolean') options.push(`default: ${defaultBoolean}`)
    }

    if (field.type === 'Date') {
        const defaultDateMode = field.defaultDateMode
        if (defaultDateMode === 'now') {
            options.push('default: Date.now')
        } else if (defaultDateMode === 'custom') {
            const defaultDateValue = String(field.defaultDateValue || '').trim()
            if (defaultDateValue) options.push(`default: new Date(${JSON.stringify(defaultDateValue)})`)
        }

        const minDateValue = String(field.minDate || '').trim()
        if (minDateValue) options.push(`min: new Date(${JSON.stringify(minDateValue)})`)

        const maxDateValue = String(field.maxDate || '').trim()
        if (maxDateValue) options.push(`max: new Date(${JSON.stringify(maxDateValue)})`)

        const expires = parseOptionalNumber(field.expiresSeconds)
        if (typeof expires === 'number' && expires >= 0) options.push(`expires: ${expires}`)
    }

    if (field.type === 'ObjectId') {
        const defaultObjectId = String(field.defaultObjectId || '').trim()
        if (defaultObjectId) options.push(`default: ${JSON.stringify(defaultObjectId)}`)
    }

    if (field.type === 'Map') {
        const mapOfType = String(field.mapOfType || '').trim()
        if (mapOfType) options.push(`of: ${typeToSchemaCode(mapOfType)}`)
    }

    if (field.type === 'Array') {
        const arrayOfType = String(field.arrayOfType || '').trim()
        if (arrayOfType) options.push(`of: ${typeToSchemaCode(arrayOfType)}`)
    }

    return options
}

const generateSchemaCode = (fields, indentLevel = 1) => {
    let code = '';
    const indent = '  '.repeat(indentLevel);

    fields.forEach(field => {
        if (field.name === '_id') return;

        // Handle Nested Objects
        if (field.children && field.children.length > 0) {
            if (field.type === 'Array') {
                code += `${indent}${field.name}: [{\n`;
                code += generateSchemaCode(field.children, indentLevel + 1);
                code += `${indent}}],\n`;
            } else {
                code += `${indent}${field.name}: {\n`;
                code += generateSchemaCode(field.children, indentLevel + 1);
                code += `${indent}},\n`;
            }
            return;
        }

        const optionEntries = buildFieldOptionEntries(field)
        code += `${indent}${field.name}: { ${optionEntries.join(', ')} },\n`;
    });

    return code;
}

const buildSchemaOptions = (collectionData = {}) => {
    const options = {}

    if (collectionData.timestampsEnabled) {
        if (collectionData.createdAtName || collectionData.updatedAtName) {
            options.timestamps = {}
            if (collectionData.createdAtName) options.timestamps.createdAt = collectionData.createdAtName
            if (collectionData.updatedAtName) options.timestamps.updatedAt = collectionData.updatedAtName
        } else {
            options.timestamps = true
        }
    }

    const collectionName = String(collectionData.schemaCollectionName || '').trim()
    if (collectionName) options.collection = collectionName

    const strictMode = collectionData.schemaStrictMode
    if (strictMode === 'throw') {
        options.strict = 'throw'
    } else {
        const strictBool = parseTriStateBoolean(strictMode)
        if (typeof strictBool === 'boolean') options.strict = strictBool
    }

    const strictQuery = parseTriStateBoolean(collectionData.schemaStrictQueryMode)
    if (typeof strictQuery === 'boolean') options.strictQuery = strictQuery

    const autoIndex = parseTriStateBoolean(collectionData.schemaAutoIndexMode)
    if (typeof autoIndex === 'boolean') options.autoIndex = autoIndex

    const autoCreate = parseTriStateBoolean(collectionData.schemaAutoCreateMode)
    if (typeof autoCreate === 'boolean') options.autoCreate = autoCreate

    const idVirtual = parseTriStateBoolean(collectionData.schemaIdVirtualMode)
    if (typeof idVirtual === 'boolean') options.id = idVirtual

    const useIdField = parseTriStateBoolean(collectionData.schemaUnderscoreIdMode)
    if (typeof useIdField === 'boolean') options._id = useIdField

    const minimize = parseTriStateBoolean(collectionData.schemaMinimizeMode)
    if (typeof minimize === 'boolean') options.minimize = minimize

    const skipVersioning = parseTriStateBoolean(collectionData.schemaSkipVersioningMode)
    if (typeof skipVersioning === 'boolean') options.skipVersioning = skipVersioning

    const optimisticConcurrency = parseTriStateBoolean(collectionData.schemaOptimisticConcurrencyMode)
    if (typeof optimisticConcurrency === 'boolean') options.optimisticConcurrency = optimisticConcurrency

    const versionKeyMode = collectionData.schemaVersionKeyMode
    if (versionKeyMode === 'disable') {
        options.versionKey = false
    } else if (versionKeyMode === 'custom') {
        const customVersionKey = String(collectionData.schemaVersionKeyName || '').trim()
        if (customVersionKey) options.versionKey = customVersionKey
    }

    if (collectionData.schemaCappedEnabled) {
        const capped = {}
        const cappedSize = Number(collectionData.schemaCappedSize || 0)
        const cappedMax = Number(collectionData.schemaCappedMax || 0)
        const cappedAutoIndexId = parseTriStateBoolean(collectionData.schemaCappedAutoIndexIdMode)

        if (cappedSize > 0) capped.size = cappedSize
        if (cappedMax > 0) capped.max = cappedMax
        if (typeof cappedAutoIndexId === 'boolean') capped.autoIndexId = cappedAutoIndexId

        if (Object.keys(capped).length > 0) {
            options.capped = capped
        } else {
            options.capped = true
        }
    }

    const readPreference = String(collectionData.schemaReadPreference || '').trim()
    if (readPreference) options.read = readPreference

    const writeConcern = {}
    const writeConcernW = String(collectionData.schemaWriteConcernW || '').trim()
    const writeConcernJ = parseTriStateBoolean(collectionData.schemaWriteConcernJMode)
    const writeConcernWtimeout = Number(collectionData.schemaWriteConcernWtimeout || 0)

    if (writeConcernW) {
        const numericW = Number(writeConcernW)
        writeConcern.w = Number.isFinite(numericW) && writeConcernW !== '' ? numericW : writeConcernW
    }
    if (typeof writeConcernJ === 'boolean') writeConcern.j = writeConcernJ
    if (writeConcernWtimeout > 0) writeConcern.wtimeout = writeConcernWtimeout
    if (Object.keys(writeConcern).length > 0) options.writeConcern = writeConcern

    const collationLocale = String(collectionData.schemaCollationLocale || '').trim()
    if (collationLocale) {
        const collation = { locale: collationLocale }
        const collationStrength = Number(collectionData.schemaCollationStrength || 0)
        const collationCaseLevel = parseTriStateBoolean(collectionData.schemaCollationCaseLevelMode)
        const collationCaseFirst = String(collectionData.schemaCollationCaseFirst || '').trim()
        const collationNumericOrdering = parseTriStateBoolean(collectionData.schemaCollationNumericOrderingMode)

        if (collationStrength >= 1 && collationStrength <= 5) collation.strength = collationStrength
        if (typeof collationCaseLevel === 'boolean') collation.caseLevel = collationCaseLevel
        if (collationCaseFirst) collation.caseFirst = collationCaseFirst
        if (typeof collationNumericOrdering === 'boolean') collation.numericOrdering = collationNumericOrdering

        options.collation = collation
    }

    return options
}

const schemaOptionsToCode = (optionsObj) => {
    return Object.keys(optionsObj).length > 0
        ? `, ${JSON.stringify(optionsObj, null, 2).replace(/"([^"]+)":/g, '$1:')}`
        : ''
}

const isValidProjectPayload = (payload) => {
    return payload &&
        Array.isArray(payload.collections) &&
        Array.isArray(payload.edges)
}

export const useSchemaStore = defineStore('schema', {
    state: () => useStorage(STORAGE_KEY, {
        databases: [
            {
                id: 'db-main',
                name: 'MainDB',
            },
        ],
        activeDatabaseId: 'db-main',
        collections: [
            {
                id: '1',
                databaseId: 'db-main',
                type: 'collection',
                position: { x: 250, y: 5 },
                data: {
                    label: 'Users',
                    fields: [
                        { id: 'f1', name: '_id', type: 'ObjectId', key: true },
                        { id: 'f2', name: 'username', type: 'String' },
                        { id: 'f3', name: 'email', type: 'String' },
                        {
                            id: 'f-addr',
                            name: 'address',
                            type: 'Object',
                            children: [
                                { id: 'f-city', name: 'city', type: 'String' },
                                { id: 'f-zip', name: 'zip', type: 'Number' }
                            ]
                        }
                    ]
                },
            },
            {
                id: '2',
                databaseId: 'db-main',
                type: 'collection',
                position: { x: 100, y: 250 },
                data: {
                    label: 'Posts',
                    fields: [
                        { id: 'f4', name: '_id', type: 'ObjectId', key: true },
                        { id: 'f5', name: 'title', type: 'String' },
                        { id: 'f6', name: 'author_id', type: 'ObjectId', ref: 'Users' },
                    ]
                },
            },
        ],
        edges: [
            { id: 'e1-2', databaseId: 'db-main', source: '1', target: '2', sourceHandle: 'f1', targetHandle: 'f6', animated: true, style: { stroke: '#10b981' } }
        ],
        selectedItemId: null,
        selectedItemType: null,
        selectedCollectionId: null,
        clipboard: null,
        canUndo: false,
        canRedo: false,
        isDirty: false,
    }),
    getters: {
        activeDatabase: (state) => state.databases.find((db) => db.id === state.activeDatabaseId) || null,
        activeCollections: (state) => state.collections.filter((collection) => collection.databaseId === state.activeDatabaseId),
        activeEdges: (state) => state.edges.filter((edge) => edge.databaseId === state.activeDatabaseId),
        selectedItem: (state) => {
            if (!state.selectedItemId) return null

            if (state.selectedItemType === 'collection') {
                return state.collections.find(c => c.id === state.selectedItemId)
            }

            if (state.selectedItemType === 'field' && state.selectedCollectionId) {
                const collection = state.collections.find(c => c.id === state.selectedCollectionId)
                if (collection) {
                    const result = findFieldRecursively(collection.data.fields, state.selectedItemId)
                    return result ? result.field : null
                }
            }
            return null
        },
        getCollectionCode: (state) => (id) => {
            const col = state.collections.find(c => c.id === id);
            if (!col) return '';

            let code = "const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n";

            const optionsStr = schemaOptionsToCode(buildSchemaOptions(col.data))

            code += `const ${col.data.label}Schema = new Schema({\n`;
            code += generateSchemaCode(col.data.fields);
            code += `}${optionsStr});\n\n`;
            code += `const ${col.data.label} = mongoose.model('${col.data.label}', ${col.data.label}Schema);\n\n`;
            return code;
        },
        mongooseSchemaCode: (state) => {
            let code = "const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n";
            state.collections.forEach(col => {
                const optionsStr = schemaOptionsToCode(buildSchemaOptions(col.data))

                code += `const ${col.data.label}Schema = new Schema({\n`;
                code += generateSchemaCode(col.data.fields);
                code += `}${optionsStr});\n\n`;
                code += `const ${col.data.label} = mongoose.model('${col.data.label}', ${col.data.label}Schema);\n\n`;
            });
            return code;
        },
        getCollectionsCode: (state) => (ids = []) => {
            if (!Array.isArray(ids) || ids.length === 0) return ''

            const selectedIds = new Set(ids)
            let code = "const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n"

            state.collections
                .filter((col) => selectedIds.has(col.id))
                .forEach((col) => {
                    const optionsStr = schemaOptionsToCode(buildSchemaOptions(col.data))

                    code += `const ${col.data.label}Schema = new Schema({\n`
                    code += generateSchemaCode(col.data.fields)
                    code += `}${optionsStr});\n\n`
                    code += `const ${col.data.label} = mongoose.model('${col.data.label}', ${col.data.label}Schema);\n\n`
                })

            return code
        }
    },
    actions: {
        pruneInvalidEdges(databaseId = null) {
            const collections = databaseId
                ? this.collections.filter((collection) => collection.databaseId === databaseId)
                : this.collections
            const collectionMap = new Map(collections.map((collection) => [collection.id, collection]))

            const filteredEdges = this.edges.filter((edge) => {
                if (databaseId && edge.databaseId !== databaseId) return true

                const sourceCollection = collectionMap.get(edge.source)
                const targetCollection = collectionMap.get(edge.target)
                if (!sourceCollection || !targetCollection) return false

                if (edge.sourceHandle && !fieldExistsInCollection(sourceCollection, edge.sourceHandle)) return false
                if (edge.targetHandle && !fieldExistsInCollection(targetCollection, edge.targetHandle)) return false

                return true
            })

            if (filteredEdges.length === this.edges.length && filteredEdges.every((edge, index) => edge === this.edges[index])) {
                return
            }

            this.edges = filteredEdges
        },
        persistState() {
            const result = persistProjectState(this)
            if (result?.ok) {
                hasShownStorageFullAlert = false
                return true
            }

            if (isQuotaExceededError(result?.error) && !hasShownStorageFullAlert) {
                hasShownStorageFullAlert = true
                const ui = useUiStore()
                ui.openAlert({
                    title: 'Storage Full',
                    message: 'Browser local storage is full. Please export your current project now to avoid data loss, then remove old data/import only what you need.',
                    confirmText: 'I Understand',
                })
                ui.showToast('Storage full. Export your project now.', 'error', 5000)
            }
            return false
        },
        initializeDatabases() {
            if (!Array.isArray(this.databases) || this.databases.length === 0) {
                this.databases = [{ id: 'db-main', name: 'MainDB' }]
            }

            if (!this.activeDatabaseId || !this.databases.some((db) => db.id === this.activeDatabaseId)) {
                this.activeDatabaseId = this.databases[0].id
            }

            const knownDbIds = new Set(this.databases.map((db) => db.id))
            const fallbackDbId = this.activeDatabaseId

            this.collections.forEach((collection) => {
                if (!collection.databaseId || !knownDbIds.has(collection.databaseId)) {
                    collection.databaseId = fallbackDbId
                }
            })

            this.edges.forEach((edge) => {
                if (!edge.databaseId || !knownDbIds.has(edge.databaseId)) {
                    const sourceCollection = this.collections.find((collection) => collection.id === edge.source)
                    edge.databaseId = sourceCollection?.databaseId || fallbackDbId
                }
            })

            this.pruneInvalidEdges()
            this.persistState()
        },
        addDatabase(name = 'New Database') {
            const id = `db-${Date.now()}`
            this.databases.push({ id, name: String(name).trim() || 'New Database' })
            this.activeDatabaseId = id
            this.clearSelections()
            return id
        },
        setActiveDatabase(id) {
            if (!this.databases.some((db) => db.id === id)) return
            this.activeDatabaseId = id
            this.pruneInvalidEdges(id)
            this.clearSelections()
        },
        updateDatabaseName(id, name) {
            const target = this.databases.find((db) => db.id === id)
            if (!target) return
            target.name = String(name).trim() || target.name
            this.persistState()
        },
        removeDatabase(id) {
            if (this.databases.length <= 1) return { success: false, message: 'At least one database is required.' }
            const exists = this.databases.some((db) => db.id === id)
            if (!exists) return { success: false, message: 'Database not found.' }

            this.recordHistory()
            this.databases = this.databases.filter((db) => db.id !== id)
            this.collections = this.collections.filter((collection) => collection.databaseId !== id)
            this.edges = this.edges.filter((edge) => edge.databaseId !== id)

            if (this.activeDatabaseId === id) {
                this.activeDatabaseId = this.databases[0].id
            }

            this.clearSelections()
            this.syncHistoryState()
            return { success: true }
        },
        syncHistoryState() {
            historyState.past = pruneHistory(historyState.past)
            historyState.future = pruneHistory(historyState.future)
            this.canUndo = historyState.past.length > 0
            this.canRedo = historyState.future.length > 0
            this.isDirty = this.canUndo || this.canRedo
            this.persistState()
        },
        initializeHistory() {
            historyState.past = []
            historyState.future = []
            historyState.isRestoring = false
            this.syncHistoryState()
        },
        getHistorySnapshot() {
            return JSON.stringify({
                databases: this.databases,
                activeDatabaseId: this.activeDatabaseId,
                collections: this.collections,
                edges: this.edges,
            })
        },
        applyHistorySnapshot(snapshot) {
            const parsed = JSON.parse(snapshot)
            this.databases = parsed.databases || this.databases
            this.activeDatabaseId = parsed.activeDatabaseId || this.activeDatabaseId
            this.collections = parsed.collections || []
            this.edges = parsed.edges || []
            this.initializeDatabases()
            this.selectItem(null, null, null)
        },
        recordHistory() {
            if (historyState.isRestoring) return

            const snapshot = this.getHistorySnapshot()
            const lastSnapshot = historyState.past[historyState.past.length - 1]?.snapshot
            if (lastSnapshot === snapshot) return

            historyState.past = pruneHistory(historyState.past)
            historyState.past.push({ snapshot, createdAt: Date.now() })
            if (historyState.past.length > HISTORY_MAX_SIZE) {
                historyState.past.shift()
            }
            historyState.future = []
            this.syncHistoryState()
        },
        undo() {
            if (!historyState.past.length) return false

            const currentSnapshot = this.getHistorySnapshot()
            const previousSnapshot = historyState.past.pop()?.snapshot
            if (!previousSnapshot) return false

            historyState.future = pruneHistory(historyState.future)
            historyState.future.push({ snapshot: currentSnapshot, createdAt: Date.now() })
            if (historyState.future.length > HISTORY_MAX_SIZE) {
                historyState.future.shift()
            }
            historyState.isRestoring = true
            this.applyHistorySnapshot(previousSnapshot)
            historyState.isRestoring = false
            this.syncHistoryState()
            return true
        },
        redo() {
            if (!historyState.future.length) return false

            const currentSnapshot = this.getHistorySnapshot()
            const nextSnapshot = historyState.future.pop()?.snapshot
            if (!nextSnapshot) return false

            historyState.past = pruneHistory(historyState.past)
            historyState.past.push({ snapshot: currentSnapshot, createdAt: Date.now() })
            if (historyState.past.length > HISTORY_MAX_SIZE) {
                historyState.past.shift()
            }
            historyState.isRestoring = true
            this.applyHistorySnapshot(nextSnapshot)
            historyState.isRestoring = false
            this.syncHistoryState()
            return true
        },
        clearSelections() {
            this.collections.forEach((collection) => {
                collection.selected = false
            })
            this.edges.forEach((edge) => {
                edge.selected = false
            })
            this.selectItem(null, null, null)
            this.syncHistoryState()
        },
        setCollectionSelection(id, isMultiSelect = false) {
            const target = this.collections.find(c => c.id === id)
            if (!target) return
            if (target.databaseId !== this.activeDatabaseId) return

            if (!isMultiSelect) {
                this.collections.forEach((collection) => {
                    collection.selected = collection.id === id
                })
                this.edges.forEach((edge) => {
                    edge.selected = false
                })
                this.selectItem(id, 'collection')
                return
            }

            const selectedCollections = this.collections.filter((collection) => collection.selected && collection.databaseId === this.activeDatabaseId)
            const isOnlySelectedTarget = target.selected && selectedCollections.length === 1

            if (isOnlySelectedTarget) {
                this.selectItem(target.id, 'collection')
                return
            }

            target.selected = !target.selected

            const updatedSelectedCollections = this.collections.filter((collection) => collection.selected && collection.databaseId === this.activeDatabaseId)
            if (updatedSelectedCollections.length === 1) {
                this.selectItem(updatedSelectedCollections[0].id, 'collection')
            } else {
                this.selectItem(null, null, null)
            }
        },
        exportProject() {
            return JSON.stringify({
                version: 1,
                exportedAt: new Date().toISOString(),
                databases: this.databases,
                activeDatabaseId: this.activeDatabaseId,
                collections: this.collections,
                edges: this.edges,
            }, null, 2)
        },
        importProject(rawPayload) {
            let parsed
            try {
                parsed = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : rawPayload
            } catch (error) {
                return { success: false, message: 'Invalid JSON format.' }
            }

            if (!isValidProjectPayload(parsed)) {
                return { success: false, message: 'Invalid project file structure.' }
            }

            this.recordHistory()
            if (Array.isArray(parsed.databases) && parsed.databases.length > 0) {
                this.databases = parsed.databases
            }
            this.collections = parsed.collections
            this.edges = parsed.edges
            this.activeDatabaseId = parsed.activeDatabaseId || this.databases[0]?.id || 'db-main'
            this.initializeDatabases()
            this.pruneInvalidEdges()
            this.selectItem(null, null, null)
            this.clipboard = null
            this.syncHistoryState()

            return { success: true }
        },
        selectItem(id, type, collectionId = null) {
            this.selectedItemId = id
            this.selectedItemType = type
            this.selectedCollectionId = collectionId
        },
        updateCollectionProps(id, newProps) {
            const collection = this.collections.find(c => c.id === id)
            if (collection) {
                this.recordHistory()
                Object.assign(collection.data, newProps)
                this.syncHistoryState()
            }
        },
        updateFieldProps(collectionId, fieldId, newProps) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                const result = findFieldRecursively(collection.data.fields, fieldId)
                if (result) {
                    this.recordHistory()
                    Object.assign(result.field, newProps)
                    this.syncHistoryState()
                }
            }
        },
        addCollection(collection) {
            this.recordHistory()
            collection.databaseId = collection.databaseId || this.activeDatabaseId
            this.collections.push(collection)
            this.pruneInvalidEdges(collection.databaseId)
            this.syncHistoryState()
        },
        updateCollectionPosition(id, position) {
            const index = this.collections.findIndex(c => c.id === id)
            if (index !== -1) {
                this.recordHistory()
                this.collections[index].position = position
                this.syncHistoryState()
            }
        },
        addField(collectionId, field) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                this.recordHistory()
                collection.data.fields.push(field)
                this.syncHistoryState()
            }
        },
        addChildField(collectionId, parentFieldId, field) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                const result = findFieldRecursively(collection.data.fields, parentFieldId)
                if (result) {
                    this.recordHistory()
                    if (!result.field.children) result.field.children = []
                    result.field.children.push(field)
                    this.syncHistoryState()
                }
            }
        },
        removeField(collectionId, fieldId) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                this.recordHistory()
                const removeRecursive = (list) => {
                    const index = list.findIndex(f => f.id === fieldId)
                    if (index !== -1) {
                        list.splice(index, 1)
                        return true
                    }
                    for (const item of list) {
                        if (item.children && item.children.length > 0) {
                            if (removeRecursive(item.children)) return true
                        }
                    }
                    return false
                }

                removeRecursive(collection.data.fields)
                this.pruneInvalidEdges(collection.databaseId)

                if (this.selectedItemId === fieldId) {
                    this.selectItem(null, null)
                }
                this.syncHistoryState()
            }
        },
        removeCollection(id) {
            this.recordHistory()
            const target = this.collections.find((collection) => collection.id === id)
            const dbId = target?.databaseId || this.activeDatabaseId
            this.collections = this.collections.filter(c => c.id !== id)
            this.edges = this.edges.filter(e => e.source !== id && e.target !== id)
            this.pruneInvalidEdges(dbId)

            if (this.selectedItemId === id) {
                this.selectItem(null, null)
            }
            this.syncHistoryState()
        },
        removeCollections(ids = []) {
            if (!Array.isArray(ids) || ids.length === 0) return
            this.recordHistory()
            const idSet = new Set(ids)
            const affectedDbIds = new Set(
                this.collections
                    .filter((collection) => idSet.has(collection.id))
                    .map((collection) => collection.databaseId)
            )
            this.collections = this.collections.filter(c => !idSet.has(c.id))
            this.edges = this.edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target))
            affectedDbIds.forEach((dbId) => this.pruneInvalidEdges(dbId))
            this.selectItem(null, null, null)
            this.syncHistoryState()
        },
        reorderField(collectionId, parentFieldId, oldIndex, newIndex) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (!collection) return

            let targetList = collection.data.fields

            if (parentFieldId) {
                const result = findFieldRecursively(collection.data.fields, parentFieldId)
                if (result && result.field.children) {
                    targetList = result.field.children
                } else {
                    return // Parent not found or has no children
                }
            }

            if (newIndex >= 0 && newIndex < targetList.length) {
                this.recordHistory()
                const [movedItem] = targetList.splice(oldIndex, 1)
                targetList.splice(newIndex, 0, movedItem)
                this.syncHistoryState()
            }
        },
        removeEdge(id) {
            this.recordHistory()
            this.edges = this.edges.filter(e => e.id !== id)
            if (this.selectedItemId === id) {
                this.selectItem(null, null)
            }
            this.syncHistoryState()
        },
        copyNode(id) {
            const collection = this.collections.find(c => c.id === id)
            if (collection) {
                // Deep copy to avoid reference issues
                this.clipboard = JSON.parse(JSON.stringify(collection))
            }
        },
        pasteNode() {
            if (!this.clipboard) return

            this.recordHistory()
            const newId = `col-${Date.now()}`
            const newCollection = JSON.parse(JSON.stringify(this.clipboard))

            newCollection.id = newId
            // Offset position slightly
            newCollection.position = {
                x: newCollection.position.x + 20,
                y: newCollection.position.y + 20
            }
            // Update internal IDs of fields to avoid duplicates
            const updateFieldIds = (fields) => {
                fields.forEach(field => {
                    field.id = `f-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                    if (field.children) updateFieldIds(field.children)
                })
            }
            updateFieldIds(newCollection.data.fields)

            this.collections.push(newCollection)
            this.selectItem(newId, 'collection')
            this.syncHistoryState()
        }
    }
})
