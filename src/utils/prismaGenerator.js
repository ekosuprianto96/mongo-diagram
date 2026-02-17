import { DB_TYPES } from '../constants/dbTypes'

const toSnakeCaseIdentifier = (value, fallback) => {
    const normalized = String(value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
        .replace(/[^a-zA-Z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_+/g, '_')
        .toLowerCase()

    const safe = normalized || fallback
    return /^[0-9]/.test(safe) ? `n_${safe}` : safe
}

const toPascalCase = (value, fallback = 'Model') => {
    const words = String(value ?? '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)

    if (words.length === 0) return fallback
    const joined = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
    return /^[0-9]/.test(joined) ? `M${joined}` : joined
}

const toCamelCase = (value, fallback = 'field') => {
    const pascal = toPascalCase(value, fallback)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

const getUniqueName = (baseName, usedNames) => {
    if (!usedNames.has(baseName)) {
        usedNames.add(baseName)
        return baseName
    }

    let suffix = 2
    let candidate = `${baseName}${suffix}`
    while (usedNames.has(candidate)) {
        suffix += 1
        candidate = `${baseName}${suffix}`
    }

    usedNames.add(candidate)
    return candidate
}

const normalizeLabelKey = (label) => String(label || '').trim().toLowerCase()

const normalizeActionForPrisma = (value) => {
    const action = String(value || '').trim().toUpperCase()
    const actionMap = {
        CASCADE: 'Cascade',
        RESTRICT: 'Restrict',
        'SET NULL': 'SetNull',
        'NO ACTION': 'NoAction',
        'SET DEFAULT': 'SetDefault',
    }
    return actionMap[action] || ''
}

const mapFieldTypeToPrisma = (field) => {
    const type = String(field?.type || '').toUpperCase()

    const typeMap = {
        INT: 'Int',
        INTEGER: 'Int',
        BIGINT: 'BigInt',
        SMALLINT: 'Int',
        TINYINT: 'Int',
        SERIAL: 'Int',
        BIGSERIAL: 'BigInt',
        DECIMAL: 'Decimal',
        NUMERIC: 'Decimal',
        FLOAT: 'Float',
        DOUBLE: 'Float',
        REAL: 'Float',
        BOOLEAN: 'Boolean',
        BOOL: 'Boolean',
        VARCHAR: 'String',
        CHAR: 'String',
        TEXT: 'String',
        LONGTEXT: 'String',
        ENUM: 'String',
        DATE: 'DateTime',
        DATETIME: 'DateTime',
        TIMESTAMP: 'DateTime',
        TIME: 'DateTime',
        JSON: 'Json',
        JSONB: 'Json',
        UUID: 'String',
        BLOB: 'Bytes',
        BYTEA: 'Bytes',
        XML: 'String',
    }

    return typeMap[type] || 'String'
}

const getDatasourceProvider = (dbType) => {
    if (dbType === DB_TYPES.MYSQL) return 'mysql'
    if (dbType === DB_TYPES.POSTGRESQL) return 'postgresql'
    return 'mongodb'
}

const resolveReferencedFieldName = (field, referencedModelMeta) => {
    if (!referencedModelMeta) return 'id'

    if (field.referencesColumnId && referencedModelMeta.fieldNameById.has(field.referencesColumnId)) {
        return referencedModelMeta.fieldNameById.get(field.referencesColumnId)
    }

    const byColumn = toSnakeCaseIdentifier(field.referencesColumn, 'id')
    if (referencedModelMeta.fieldNameByColumn.has(byColumn)) {
        return referencedModelMeta.fieldNameByColumn.get(byColumn)
    }

    return 'id'
}

const buildModelMeta = (collection, index) => {
    const sourceLabel = String(collection?.data?.label || '').trim()
    const tableName = toSnakeCaseIdentifier(sourceLabel, `table_${index + 1}`)
    const modelName = toPascalCase(sourceLabel || tableName, `Model${index + 1}`)
    const fields = Array.isArray(collection?.data?.fields) ? collection.data.fields : []

    const usedFieldNames = new Set()
    const fieldNameById = new Map()
    const fieldNameByColumn = new Map()

    const mappedFields = fields.map((field, fieldIndex) => {
        const columnName = toSnakeCaseIdentifier(field?.name, `column_${fieldIndex + 1}`)
        const fieldName = getUniqueName(columnName, usedFieldNames)

        fieldNameById.set(field.id, fieldName)
        if (!fieldNameByColumn.has(columnName)) {
            fieldNameByColumn.set(columnName, fieldName)
        }

        return { ...field, columnName, fieldName }
    })

    return {
        id: collection?.id,
        sourceLabel,
        tableName,
        modelName,
        fields: mappedFields,
        fieldNameById,
        fieldNameByColumn,
    }
}

export const generatePrismaSchema = (schema, dbType) => {
    const collections = Array.isArray(schema?.collections) ? schema.collections : []
    const provider = getDatasourceProvider(dbType)

    const modelMetas = collections.map((collection, index) => buildModelMeta(collection, index))
    const modelByLabel = new Map(modelMetas.map((meta) => [normalizeLabelKey(meta.sourceLabel), meta]))

    const reverseRelations = new Map()
    const modelRelationNameRegistry = new Map(modelMetas.map((meta) => [meta.modelName, new Set()]))

    const models = modelMetas.map((meta) => {
        const lines = []
        const relationLines = []

        meta.fields.forEach((field) => {
            const prismaType = mapFieldTypeToPrisma(field)
            const isOptional = field.nullable === true
            const suffix = isOptional ? '?' : ''
            const attributes = []

            if (field.primaryKey) attributes.push('@id')
            if (field.autoIncrement) attributes.push('@default(autoincrement())')
            if (field.unique && !field.primaryKey) attributes.push('@unique')

            const defaultValue = String(field.defaultValue || '').trim()
            if (defaultValue && !field.autoIncrement) {
                if (defaultValue.toUpperCase() === 'CURRENT_TIMESTAMP' || defaultValue.toLowerCase() === 'now()') {
                    attributes.push('@default(now())')
                } else if (!Number.isNaN(Number(defaultValue))) {
                    attributes.push(`@default(${defaultValue})`)
                } else if (defaultValue.toLowerCase() === 'true' || defaultValue.toLowerCase() === 'false') {
                    attributes.push(`@default(${defaultValue.toLowerCase()})`)
                } else {
                    attributes.push(`@default(${JSON.stringify(defaultValue)})`)
                }
            }

            lines.push(`  ${field.fieldName} ${prismaType}${suffix}${attributes.length ? ` ${attributes.join(' ')}` : ''}`)

            if (!(field.foreignKey && field.referencesTable && (field.referencesColumn || field.referencesColumnId))) {
                return
            }

            const referencedModelMeta = modelByLabel.get(normalizeLabelKey(field.referencesTable))
            if (!referencedModelMeta) return

            const referencedFieldName = resolveReferencedFieldName(field, referencedModelMeta)
            const relationName = toPascalCase(
                `${meta.modelName}_${referencedModelMeta.modelName}_${field.fieldName}`,
                `${meta.modelName}${referencedModelMeta.modelName}${field.fieldName}`
            )

            const relationFieldBase = toCamelCase(referencedModelMeta.modelName, 'relation')
            const relationFieldName = getUniqueName(relationFieldBase, modelRelationNameRegistry.get(meta.modelName))
            const onDelete = normalizeActionForPrisma(field.onDelete)
            const onUpdate = normalizeActionForPrisma(field.onUpdate)

            const relationAttrs = [
                `"${relationName}"`,
                `fields: [${field.fieldName}]`,
                `references: [${referencedFieldName}]`,
            ]
            if (onDelete) relationAttrs.push(`onDelete: ${onDelete}`)
            if (onUpdate) relationAttrs.push(`onUpdate: ${onUpdate}`)

            relationLines.push(`  ${relationFieldName} ${referencedModelMeta.modelName}${isOptional ? '?' : ''} @relation(${relationAttrs.join(', ')})`)

            const reverseBase = toCamelCase(meta.modelName, 'items')
            if (!reverseRelations.has(referencedModelMeta.modelName)) {
                reverseRelations.set(referencedModelMeta.modelName, [])
            }
            reverseRelations.get(referencedModelMeta.modelName).push({
                baseName: reverseBase,
                relationName,
                modelName: meta.modelName,
            })
        })

        const reverse = reverseRelations.get(meta.modelName) || []
        reverse.forEach((entry) => {
            const fieldName = getUniqueName(entry.baseName, modelRelationNameRegistry.get(meta.modelName))
            relationLines.push(`  ${fieldName} ${entry.modelName}[] @relation(\"${entry.relationName}\")`)
        })

        lines.push(...relationLines)
        lines.push(`\n  @@map(${JSON.stringify(meta.tableName)})`)

        return `model ${meta.modelName} {\n${lines.join('\n')}\n}`
    })

    const datasourceBlock = [
        'datasource db {',
        `  provider = ${JSON.stringify(provider)}`,
        '  url      = env("DATABASE_URL")',
        '}',
    ].join('\n')

    const generatorBlock = [
        'generator client {',
        '  provider = "prisma-client-js"',
        '}',
    ].join('\n')

    return [generatorBlock, datasourceBlock, ...models].join('\n\n')
}

