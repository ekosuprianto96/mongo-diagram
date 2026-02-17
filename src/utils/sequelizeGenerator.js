import { DB_TYPES } from '../constants/dbTypes'

export const SEQUELIZE_OUTPUT_MODE = {
    INIT: 'init',
    PER_MODEL: 'per_model',
}

/* ======================================================
   Utilities
====================================================== */

const toSnakeCase = (value, fallback) => {
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

    if (!words.length) return fallback

    const joined = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('')

    return /^[0-9]/.test(joined) ? `M${joined}` : joined
}

const toCamelCase = (value, fallback = 'field') => {
    const pascal = toPascalCase(value, fallback)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

const normalizeLabelKey = (label) =>
    String(label || '').trim().toLowerCase()

const getUniqueName = (base, used) => {
    if (!used.has(base)) {
        used.add(base)
        return base
    }

    let i = 2
    let candidate = `${base}_${i}`

    while (used.has(candidate)) {
        i++
        candidate = `${base}_${i}`
    }

    used.add(candidate)
    return candidate
}

/* ======================================================
   Type Mapping
====================================================== */

const mapToSequelizeType = (field, dbType) => {
    const type = String(field?.type || '').toUpperCase()
    const params = String(field?.typeParams || '').trim()

    const simpleMap = {
        TEXT: 'DataTypes.TEXT',
        LONGTEXT: 'DataTypes.TEXT',
        INT: 'DataTypes.INTEGER',
        INTEGER: 'DataTypes.INTEGER',
        BIGINT: 'DataTypes.BIGINT',
        SMALLINT: 'DataTypes.SMALLINT',
        TINYINT: 'DataTypes.TINYINT',
        BOOLEAN: 'DataTypes.BOOLEAN',
        BOOL: 'DataTypes.BOOLEAN',
        DATE: 'DataTypes.DATEONLY',
        DATETIME: 'DataTypes.DATE',
        TIMESTAMP: 'DataTypes.DATE',
        TIME: 'DataTypes.TIME',
        JSON: 'DataTypes.JSON',
        JSONB: 'DataTypes.JSON',
        UUID: 'DataTypes.UUID',
        BLOB: 'DataTypes.BLOB',
        BYTEA: 'DataTypes.BLOB',
        REAL: 'DataTypes.REAL',
        DOUBLE: 'DataTypes.DOUBLE',
        FLOAT: 'DataTypes.FLOAT',
    }

    if (simpleMap[type]) return simpleMap[type]

    if (type === 'VARCHAR') {
        const length = Number(params) || 255
        return `DataTypes.STRING(${length})`
    }

    if (type === 'CHAR') {
        const length = Number(params) || 1
        return `DataTypes.CHAR(${length})`
    }

    if (type === 'DECIMAL') {
        const [precision, scale] = params.split(',').map(Number)
        if (precision && scale) return `DataTypes.DECIMAL(${precision}, ${scale})`
        if (precision) return `DataTypes.DECIMAL(${precision})`
        return 'DataTypes.DECIMAL'
    }

    if (dbType === DB_TYPES.POSTGRESQL && type === 'INTERVAL') {
        return 'DataTypes.STRING'
    }

    return 'DataTypes.STRING'
}

/* ======================================================
   Default Value Formatter
====================================================== */

const formatDefaultValue = (value) => {
    if (value == null || value === '') return null

    const raw = String(value).trim()

    if (/^CURRENT_TIMESTAMP$/i.test(raw) || /^now\(\)$/i.test(raw))
        return 'DataTypes.NOW'

    if (!isNaN(Number(raw))) return raw

    if (raw === 'true' || raw === 'false')
        return raw

    return JSON.stringify(raw)
}

/* ======================================================
   Field Builder
====================================================== */

const buildFieldDefinition = (field, columnName, dbType) => {
    const options = []

    options.push(`type: ${mapToSequelizeType(field, dbType)}`)
    options.push(`field: "${columnName}"`)

    if (field.primaryKey) options.push('primaryKey: true')
    if (field.autoIncrement) options.push('autoIncrement: true')
    if (!field.primaryKey) {
        options.push(`allowNull: ${field.nullable === true}`)
    }
    if (field.unique) options.push('unique: true')

    const defaultValue = formatDefaultValue(field.defaultValue)
    if (defaultValue) {
        options.push(`defaultValue: ${defaultValue}`)
    }

    return `{
      ${options.join(',\n      ')}
    }`
}

/* ======================================================
   Context Builder
====================================================== */

const buildModelContext = (collections = [], dbType) => {
    const usedTables = new Set()
    const usedModels = new Set()

    const metas = collections.map((collection, index) => {
        const tableName = getUniqueName(
            toSnakeCase(collection?.data?.label, `table_${index + 1}`),
            usedTables
        )

        const modelName = getUniqueName(
            toPascalCase(collection?.data?.label, `Model${index + 1}`),
            usedModels
        )

        const fields = collection?.data?.fields ?? []

        return { modelName, tableName, fields }
    })

    const modelBlocks = metas.map(meta => {
        const fieldLines = meta.fields.map((field, index) => {
            const columnName = toSnakeCase(
                field?.name,
                `column_${index + 1}`
            )

            const fieldCode = buildFieldDefinition(
                field,
                columnName,
                dbType
            )

            return `    ${columnName}: ${fieldCode}`
        })

        return {
            modelName: meta.modelName,
            tableName: meta.tableName,
            fieldsCode: fieldLines.join(',\n')
        }
    })

    return {
        modelBlocks,
        modelNames: metas.map(m => m.modelName)
    }
}

/* ======================================================
   Renderers
====================================================== */

const renderSingleInit = (ctx) => {
    const modelDefinitions = ctx.modelBlocks.map(model => `
  const ${model.modelName} = sequelize.define("${model.modelName}", {
${model.fieldsCode}
  }, {
    tableName: "${model.tableName}",
    timestamps: false
  });
  `).join('\n')

    return `import { DataTypes } from 'sequelize';

export function initSequelizeModels(sequelize) {
${modelDefinitions}

  return {
    ${ctx.modelNames.join(',\n    ')}
  };
}
`
}

const renderPerModel = (ctx) => {
    const modelFiles = ctx.modelBlocks.map(model => `
// models/${model.modelName}.js
import { DataTypes } from 'sequelize';

export default function define${model.modelName}(sequelize) {
  const ${model.modelName} = sequelize.define("${model.modelName}", {
${model.fieldsCode}
  }, {
    tableName: "${model.tableName}",
    timestamps: false
  });

  return ${model.modelName};
}
`)

    const imports = ctx.modelNames
        .map(n => `import define${n} from './${n}.js';`)
        .join('\n')

    const inits = ctx.modelNames
        .map(n => `  const ${n} = define${n}(sequelize);`)
        .join('\n')

    return `
${modelFiles.join('\n')}

// models/index.js
${imports}

export function initModels(sequelize) {
${inits}

  return {
    ${ctx.modelNames.join(',\n    ')}
  };
}
`
}

/* ======================================================
   Public API
====================================================== */

export const generateSequelizeModels = (
    schema,
    dbType,
    mode = SEQUELIZE_OUTPUT_MODE.INIT
) => {
    const collections = schema?.collections ?? []
    const ctx = buildModelContext(collections, dbType)

    if (mode === SEQUELIZE_OUTPUT_MODE.PER_MODEL) {
        return renderPerModel(ctx)
    }

    return renderSingleInit(ctx)
}
