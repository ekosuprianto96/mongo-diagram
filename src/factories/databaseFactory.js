import { DB_TYPES, DEFAULT_FIELDS } from '../constants/dbTypes'
import { generateSQL } from '../utils/sqlGenerator'
import { generatePrismaSchema } from '../utils/prismaGenerator'
import { generateLaravelMigrations } from '../utils/laravelMigrationGenerator'
import { generateTypeOrmEntities } from '../utils/typeormGenerator'
import { generateSequelizeModels } from '../utils/sequelizeGenerator'
import { EXPORT_TARGETS } from '../constants/exportTargets'

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

const EXPORT_TARGET_OPTIONS = {
    [DB_TYPES.MONGODB]: [
        { value: EXPORT_TARGETS.MONGOOSE, label: 'Mongoose', language: 'javascript' },
    ],
    [DB_TYPES.MYSQL]: [
        { value: EXPORT_TARGETS.SQL, label: 'SQL', language: 'sql' },
        { value: EXPORT_TARGETS.PRISMA, label: 'Prisma', language: 'plaintext' },
        { value: EXPORT_TARGETS.LARAVEL, label: 'Laravel', language: 'php' },
        { value: EXPORT_TARGETS.TYPEORM, label: 'TypeORM', language: 'typescript' },
        { value: EXPORT_TARGETS.SEQUELIZE, label: 'Sequelize', language: 'javascript' },
    ],
    [DB_TYPES.POSTGRESQL]: [
        { value: EXPORT_TARGETS.SQL, label: 'SQL', language: 'sql' },
        { value: EXPORT_TARGETS.PRISMA, label: 'Prisma', language: 'plaintext' },
        { value: EXPORT_TARGETS.LARAVEL, label: 'Laravel', language: 'php' },
        { value: EXPORT_TARGETS.TYPEORM, label: 'TypeORM', language: 'typescript' },
        { value: EXPORT_TARGETS.SEQUELIZE, label: 'Sequelize', language: 'javascript' },
    ],
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

export const getExportTargetOptions = (dbType) => {
    return EXPORT_TARGET_OPTIONS[dbType] || EXPORT_TARGET_OPTIONS[DB_TYPES.MONGODB]
}

export const getDefaultExportTarget = (dbType) => {
    return getExportTargetOptions(dbType)[0].value
}

const createMongoAdapter = () => ({
    type: DB_TYPES.MONGODB,
    getDefaultField: () => ({ ...DEFAULT_FIELDS[DB_TYPES.MONGODB] }),
    getExportTargets: () => getExportTargetOptions(DB_TYPES.MONGODB),
    getLanguage: (target = EXPORT_TARGETS.MONGOOSE) => {
        const option = getExportTargetOptions(DB_TYPES.MONGODB).find((item) => item.value === target)
        return option?.language || 'javascript'
    },
    getDefaultExportTarget: () => getDefaultExportTarget(DB_TYPES.MONGODB),
    getEntityTerms: () => getDatabaseEntityTerms(DB_TYPES.MONGODB),
    generateCode: ({ target = EXPORT_TARGETS.MONGOOSE, store, collectionId = null, collectionIds = [] }) => {
        if (!store) return ''
        if (target !== EXPORT_TARGETS.MONGOOSE) return ''

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
    getExportTargets: () => getExportTargetOptions(DB_TYPES.MYSQL),
    getLanguage: (target = EXPORT_TARGETS.SQL) => {
        const option = getExportTargetOptions(DB_TYPES.MYSQL).find((item) => item.value === target)
        return option?.language || 'sql'
    },
    getDefaultExportTarget: () => getDefaultExportTarget(DB_TYPES.MYSQL),
    getEntityTerms: () => getDatabaseEntityTerms(DB_TYPES.MYSQL),
    generateCode: ({ target = EXPORT_TARGETS.SQL, collections = [] }) => {
        if (target === EXPORT_TARGETS.PRISMA) {
            return generatePrismaSchema({ collections }, DB_TYPES.MYSQL)
        }
        if (target === EXPORT_TARGETS.LARAVEL) {
            return generateLaravelMigrations({ collections }, DB_TYPES.MYSQL)
        }
        if (target === EXPORT_TARGETS.TYPEORM) {
            return generateTypeOrmEntities({ collections }, DB_TYPES.MYSQL)
        }
        if (target === EXPORT_TARGETS.SEQUELIZE) {
            return generateSequelizeModels({ collections }, DB_TYPES.MYSQL)
        }
        return generateSQL({ collections }, DB_TYPES.MYSQL)
    },
})

const createPostgreSQLAdapter = () => ({
    type: DB_TYPES.POSTGRESQL,
    getDefaultField: () => ({ ...DEFAULT_FIELDS[DB_TYPES.POSTGRESQL] }),
    getExportTargets: () => getExportTargetOptions(DB_TYPES.POSTGRESQL),
    getLanguage: (target = EXPORT_TARGETS.SQL) => {
        const option = getExportTargetOptions(DB_TYPES.POSTGRESQL).find((item) => item.value === target)
        return option?.language || 'sql'
    },
    getDefaultExportTarget: () => getDefaultExportTarget(DB_TYPES.POSTGRESQL),
    getEntityTerms: () => getDatabaseEntityTerms(DB_TYPES.POSTGRESQL),
    generateCode: ({ target = EXPORT_TARGETS.SQL, collections = [] }) => {
        if (target === EXPORT_TARGETS.PRISMA) {
            return generatePrismaSchema({ collections }, DB_TYPES.POSTGRESQL)
        }
        if (target === EXPORT_TARGETS.LARAVEL) {
            return generateLaravelMigrations({ collections }, DB_TYPES.POSTGRESQL)
        }
        if (target === EXPORT_TARGETS.TYPEORM) {
            return generateTypeOrmEntities({ collections }, DB_TYPES.POSTGRESQL)
        }
        if (target === EXPORT_TARGETS.SEQUELIZE) {
            return generateSequelizeModels({ collections }, DB_TYPES.POSTGRESQL)
        }
        return generateSQL({ collections }, DB_TYPES.POSTGRESQL)
    },
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
