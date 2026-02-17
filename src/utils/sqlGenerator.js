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

const getUniqueName = (baseName, usedNames) => {
    if (!usedNames.has(baseName)) {
        usedNames.add(baseName)
        return baseName
    }

    let suffix = 2
    let candidate = `${baseName}_${suffix}`
    while (usedNames.has(candidate)) {
        suffix += 1
        candidate = `${baseName}_${suffix}`
    }

    usedNames.add(candidate)
    return candidate
}

const formatConstraintName = (name, fallback) => {
    const trimmed = String(name || '').trim()
    return toSnakeCaseIdentifier(trimmed || fallback, fallback)
}

const normalizeReferentialAction = (value) => {
    const candidate = String(value || '').trim().toUpperCase()
    const allowed = new Set(['CASCADE', 'RESTRICT', 'SET NULL', 'NO ACTION', 'SET DEFAULT'])
    return allowed.has(candidate) ? candidate : ''
}

const getFieldKeyByName = (name) => String(name || '').trim().toLowerCase()

const resolveReferencedColumnName = (foreignKey, referencedTableMeta) => {
    if (!referencedTableMeta) {
        const fallbackName = String(foreignKey.referencesColumn || '').trim()
        return fallbackName ? toSnakeCaseIdentifier(fallbackName, 'id') : 'id'
    }

    const byFieldId = referencedTableMeta.columnsByFieldId.get(foreignKey.referencesColumnId)
    if (byFieldId) return byFieldId

    const nameKey = getFieldKeyByName(foreignKey.referencesColumn)
    const byFieldName = referencedTableMeta.columnsByFieldName.get(nameKey)
    if (byFieldName) return byFieldName

    const fallbackName = String(foreignKey.referencesColumn || '').trim()
    return fallbackName ? toSnakeCaseIdentifier(fallbackName, 'id') : 'id'
}

const normalizeCollectionLabelKey = (label) => String(label || '').trim().toLowerCase()

/**
 * Generate SQL DDL for the given schema and database type
 * @param {Object} schema - The schema store state
 * @param {String} dbType - 'MySQL' or 'PostgreSQL'
 * @returns {String} - The generated SQL code
 */
export const generateSQL = (schema, dbType) => {
    if (!schema || !schema.collections) return ''

    const tableMetas = schema.collections
        .map((collection) => generateCreateTableMeta(collection, dbType))
        .filter(Boolean)

    const tableMetaByLabel = new Map()
    tableMetas.forEach((meta) => {
        const key = normalizeCollectionLabelKey(meta.sourceLabel)
        if (!tableMetaByLabel.has(key)) {
            tableMetaByLabel.set(key, meta)
        }
    })

    const createTableStatements = tableMetas.map((meta) => meta.createTableSql).filter(Boolean)
    const indexStatements = tableMetas.flatMap((meta) => meta.indexStatements)

    const fkNameRegistry = new Set()
    const foreignKeyStatements = tableMetas.flatMap((meta) => {
        return meta.foreignKeys.map((foreignKey, index) => {
            const refTableMeta = tableMetaByLabel.get(normalizeCollectionLabelKey(foreignKey.referencesTable))
            const referencedTableName = refTableMeta
                ? refTableMeta.tableName
                : toSnakeCaseIdentifier(foreignKey.referencesTable, 'reference_table')
            const referencedColumnName = resolveReferencedColumnName(foreignKey, refTableMeta)

            const rawConstraintName = formatConstraintName(
                foreignKey.constraintName,
                `fk_${meta.tableName}_${foreignKey.columnName}_${index + 1}`
            )
            const constraintName = getUniqueName(rawConstraintName, fkNameRegistry)

            let statement = `ALTER TABLE ${meta.tableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${foreignKey.columnName}) REFERENCES ${referencedTableName} (${referencedColumnName})`
            if (foreignKey.onDelete) statement += ` ON DELETE ${foreignKey.onDelete}`
            if (foreignKey.onUpdate) statement += ` ON UPDATE ${foreignKey.onUpdate}`
            return `${statement};`
        })
    })

    return [...createTableStatements, ...indexStatements, ...foreignKeyStatements].join('\n\n')
}

const generateCreateTableMeta = (collection, dbType) => {
    const tableName = toSnakeCaseIdentifier(collection?.data?.label, 'untitled_table')
    const fields = collection?.data?.fields || []

    if (fields.length === 0) {
        return {
            sourceLabel: String(collection?.data?.label || ''),
            tableName,
            createTableSql: `-- Table ${tableName} has no fields`,
            indexStatements: [],
            foreignKeys: [],
            columnsByFieldId: new Map(),
            columnsByFieldName: new Map(),
        }
    }

    const columnDefs = []
    const primaryKeys = []
    const usedColumnNames = new Set()
    const checkDefs = []
    const indexStatements = []
    const foreignKeys = []
    const globalNameRegistry = new Set()
    const usedConstraintNames = new Set()
    const columnsByFieldId = new Map()
    const columnsByFieldName = new Map()

    fields.forEach((field, index) => {
        const formattedName = toSnakeCaseIdentifier(field?.name, `column_${index + 1}`)
        const columnName = getUniqueName(formattedName, usedColumnNames)
        const colDef = generateColumnDefinition(field, dbType, columnName)
        columnDefs.push(colDef)
        columnsByFieldId.set(field.id, columnName)

        const fieldNameKey = getFieldKeyByName(field.name)
        if (fieldNameKey && !columnsByFieldName.has(fieldNameKey)) {
            columnsByFieldName.set(fieldNameKey, columnName)
        }

        if (field.primaryKey) {
            primaryKeys.push(columnName)
        }

        if (field.foreignKey && field.referencesTable && (field.referencesColumn || field.referencesColumnId)) {
            foreignKeys.push({
                columnName,
                referencesTable: field.referencesTable,
                referencesColumn: field.referencesColumn,
                referencesColumnId: field.referencesColumnId,
                constraintName: field.fkConstraintName,
                onDelete: normalizeReferentialAction(field.onDelete),
                onUpdate: normalizeReferentialAction(field.onUpdate),
            })
        }

        const checkExpression = String(field.checkExpression || '').trim()
        if (checkExpression) {
            const hasProvidedName = String(field.checkConstraintName || '').trim().length > 0
            const baseConstraintName = formatConstraintName(
                field.checkConstraintName,
                `chk_${tableName}_${columnName}`
            )
            let checkDef = `CHECK (${checkExpression})`
            if (hasProvidedName) {
                const constraintName = getUniqueName(baseConstraintName, usedConstraintNames)
                checkDef = `CONSTRAINT ${constraintName} ${checkDef}`
            }
            checkDefs.push(checkDef)
        }

        if (field.index && !field.primaryKey && !field.unique) {
            const baseIndexName = formatConstraintName(field.indexName, `idx_${tableName}_${columnName}`)
            const indexName = getUniqueName(baseIndexName, globalNameRegistry)
            indexStatements.push(`CREATE INDEX ${indexName} ON ${tableName} (${columnName});`)
        }
    })

    // Add Primary Key constraint
    if (primaryKeys.length > 0) {
        columnDefs.push(`PRIMARY KEY (${primaryKeys.join(', ')})`)
    }

    const createTableSql = `CREATE TABLE ${tableName} (\n${[...columnDefs, ...checkDefs].map(c => '  ' + c).join(',\n')}\n);`
    return {
        sourceLabel: String(collection?.data?.label || ''),
        tableName,
        createTableSql,
        indexStatements,
        foreignKeys,
        columnsByFieldId,
        columnsByFieldName,
    }
}

const generateColumnDefinition = (field, dbType, columnName) => {
    const name = columnName || toSnakeCaseIdentifier(field?.name, 'column')
    const type = mapTypeToSQL(field, dbType)

    let def = `${name} ${type}`

    if (field.unsigned && dbType === DB_TYPES.MYSQL && isNumericType(type)) {
        def += ' UNSIGNED'
    }

    if (!field.nullable && !field.primaryKey) {
        def += ' NOT NULL'
    }

    // Auto Increment
    if (field.autoIncrement) {
        if (dbType === DB_TYPES.MYSQL) {
            def += ' AUTO_INCREMENT'
        } else if (dbType === DB_TYPES.POSTGRESQL) {
            // For Postgres, we usually use SERIAL type instead of explicit Auto Increment
            // But if user selected INT/BIGINT + AI, we might just handle it here or in mapTypeToSQL
            // For now, let's assume mapTypeToSQL handles SERIAL replacement if needed
            // Or we can use GENERATED ALWAYS AS IDENTITY in modern Postgres
            def += ' GENERATED BY DEFAULT AS IDENTITY'
        }
    }

    if (field.unique) {
        def += ' UNIQUE'
    }

    if (field.defaultValue !== undefined && field.defaultValue !== null && field.defaultValue !== '') {
        const defaultVal = formatDefaultValue(field.defaultValue, type)
        def += ` DEFAULT ${defaultVal}`
    }

    return def
}

const mapTypeToSQL = (field, dbType) => {
    const type = field.type
    const params = field.typeParams ? `(${field.typeParams})` : ''

    // If it's a specific SQL type chosen by user (e.g. VARCHAR, INT)
    // We just return it with params
    const sqlTypes = [
        'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT',
        'INT', 'BIGINT', 'TINYINT', 'SMALLINT', 'DECIMAL', 'FLOAT', 'DOUBLE', 'REAL', 'DOUBLE PRECISION', 'SERIAL', 'BIGSERIAL',
        'BOOLEAN', 'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR', 'INTERVAL',
        'JSON', 'JSONB', 'BLOB', 'BYTEA', 'XML',
        'ENUM', 'UUID',
    ]

    if (sqlTypes.includes(type)) {
        if (type === 'ENUM') {
            // Handle ENUM values
            if (field.enumValues && field.enumValues.length > 0) {
                const values = field.enumValues.map(v => `'${v}'`).join(', ')
                return `ENUM(${values})` // MySQL specific really, Postgres uses CREATE TYPE
            }
        }
        return `${type}${params}`
    }

    // Fallback/Mapping for Generic Types (from Mongo selection)
    switch (type) {
        case 'String': return `VARCHAR(255)`
        case 'Number': return 'INT'
        case 'Boolean': return 'BOOLEAN'
        case 'Date': return dbType === DB_TYPES.POSTGRESQL ? 'TIMESTAMP' : 'DATETIME'
        case 'ObjectId': return dbType === DB_TYPES.POSTGRESQL ? 'UUID' : 'VARCHAR(24)'
        case 'Array':
        case 'Object':
        case 'Map':
        case 'Mixed':
            return dbType === DB_TYPES.POSTGRESQL ? 'JSONB' : 'JSON'
        case 'Buffer': return 'BLOB'
        default: return 'VARCHAR(255)'
    }
}

const isNumericType = (type) => {
    return ['INT', 'BIGINT', 'TINYINT', 'SMALLINT', 'DECIMAL', 'FLOAT', 'DOUBLE'].some(t => type.toUpperCase().startsWith(t))
}

const formatDefaultValue = (val) => {
    if (typeof val === 'number') return val
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'

    const normalizedValue = String(val).trim()
    if (normalizedValue !== '' && !Number.isNaN(Number(normalizedValue))) return normalizedValue
    if (normalizedValue.toLowerCase() === 'true' || normalizedValue.toLowerCase() === 'false') {
        return normalizedValue.toUpperCase()
    }
    // If function/expression
    if (normalizedValue.toUpperCase() === 'CURRENT_TIMESTAMP' || normalizedValue.toUpperCase() === 'NOW()') {
        return normalizedValue
    }

    return `'${normalizedValue}'`
}
