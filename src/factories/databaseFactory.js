import { DB_TYPES, DEFAULT_FIELDS } from '../constants/dbTypes'
import { generateSQL } from '../utils/sqlGenerator'

const ENTITY_TERMS = {
    [DB_TYPES.MONGODB]: {
        singular: 'Collection',
        plural: 'Collections',
    },
    [DB_TYPES.MYSQL]: {
        singular: 'Table',
        plural: 'Tables',
    },
    [DB_TYPES.POSTGRESQL]: {
        singular: 'Table',
        plural: 'Tables',
    },
}

const DEFAULT_NEW_FIELD_TYPE = {
    [DB_TYPES.MONGODB]: 'String',
    [DB_TYPES.MYSQL]: 'VARCHAR',
    [DB_TYPES.POSTGRESQL]: 'VARCHAR',
}

export const getDatabaseEntityTerms = (dbType) => {
    const terms = ENTITY_TERMS[dbType] || ENTITY_TERMS[DB_TYPES.MONGODB]
    return {
        singular: terms.singular,
        plural: terms.plural,
        singularLower: terms.singular.toLowerCase(),
        pluralLower: terms.plural.toLowerCase(),
    }
}

export const getNextDefaultEntityName = (dbType, existingNames = []) => {
    const { singularLower } = getDatabaseEntityTerms(dbType)
    const baseName = `new_${singularLower}`
    const used = new Set(
        (existingNames || [])
            .map((name) => String(name || '').trim().toLowerCase())
            .filter(Boolean)
    )

    let index = 1
    let candidate = `${baseName}_${index}`
    while (used.has(candidate)) {
        index += 1
        candidate = `${baseName}_${index}`
    }
    return candidate
}

export const getDefaultNewFieldType = (dbType) => {
    return DEFAULT_NEW_FIELD_TYPE[dbType] || DEFAULT_NEW_FIELD_TYPE[DB_TYPES.MONGODB]
}

const createMongoAdapter = () => ({
    type: DB_TYPES.MONGODB,
    getDefaultField: () => ({ ...DEFAULT_FIELDS[DB_TYPES.MONGODB] }),
    getLanguage: () => 'javascript',
    getEntityTerms: () => getDatabaseEntityTerms(DB_TYPES.MONGODB),
    generateCode: ({ store, collectionId = null, collectionIds = [] }) => {
        if (!store) return ''

        if (collectionIds.length > 0) {
            return store.getCollectionsCode(collectionIds)
        }

        if (collectionId) {
            return store.getCollectionCode(collectionId)
        }

        return store.mongooseSchemaCode
    },
})

const createMySQLAdapter = () => ({
    type: DB_TYPES.MYSQL,
    getDefaultField: () => ({ ...DEFAULT_FIELDS[DB_TYPES.MYSQL] }),
    getLanguage: () => 'sql',
    getEntityTerms: () => getDatabaseEntityTerms(DB_TYPES.MYSQL),
    generateCode: ({ collections = [] }) => generateSQL({ collections }, DB_TYPES.MYSQL),
})

const createPostgreSQLAdapter = () => ({
    type: DB_TYPES.POSTGRESQL,
    getDefaultField: () => ({ ...DEFAULT_FIELDS[DB_TYPES.POSTGRESQL] }),
    getLanguage: () => 'sql',
    getEntityTerms: () => getDatabaseEntityTerms(DB_TYPES.POSTGRESQL),
    generateCode: ({ collections = [] }) => generateSQL({ collections }, DB_TYPES.POSTGRESQL),
})

const ADAPTER_FACTORY = {
    [DB_TYPES.MONGODB]: createMongoAdapter,
    [DB_TYPES.MYSQL]: createMySQLAdapter,
    [DB_TYPES.POSTGRESQL]: createPostgreSQLAdapter,
}

export const createDatabaseAdapter = (dbType) => {
    const createAdapter = ADAPTER_FACTORY[dbType] || ADAPTER_FACTORY[DB_TYPES.MONGODB]
    return createAdapter()
}
