import { DB_TYPES } from '../constants/dbTypes'

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

const toPascalCase = (value, fallback = 'Entity') => {
    const words = String(value ?? '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[^a-zA-Z0-9]+/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
    if (words.length === 0) return fallback
    const result = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('')
    return /^[0-9]/.test(result) ? `E${result}` : result
}

const toCamelCase = (value, fallback = 'field') => {
    const pascal = toPascalCase(value, fallback)
    return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

const mapToTsType = (dbTypeName) => {
    const type = String(dbTypeName || '').toUpperCase()
    if (['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'SERIAL', 'BIGSERIAL', 'DECIMAL', 'FLOAT', 'DOUBLE', 'REAL'].includes(type)) return 'number'
    if (['BOOLEAN', 'BOOL'].includes(type)) return 'boolean'
    if (['BLOB', 'BYTEA'].includes(type)) return 'Buffer'
    if (['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'].includes(type)) return 'Date'
    if (['JSON', 'JSONB'].includes(type)) return 'Record<string, unknown>'
    return 'string'
}

const normalizeAction = (value) => {
    const v = String(value || '').trim().toUpperCase()
    const allowed = new Set(['RESTRICT', 'CASCADE', 'SET NULL', 'NO ACTION', 'SET DEFAULT'])
    return allowed.has(v) ? v : 'NO ACTION'
}

export const generateTypeOrmEntities = (schema, dbType) => {
    const collections = Array.isArray(schema?.collections) ? schema.collections : []

    const metas = collections.map((collection, index) => {
        const tableName = toSnakeCase(collection?.data?.label, `table_${index + 1}`)
        const className = toPascalCase(collection?.data?.label, `Entity${index + 1}`)
        const fields = Array.isArray(collection?.data?.fields) ? collection.data.fields : []
        const columnNameByFieldId = new Map(fields.map((field, fieldIndex) => [field.id, toSnakeCase(field.name, `column_${fieldIndex + 1}`)]))
        return { collection, tableName, className, fields, columnNameByFieldId }
    })

    const byLabel = new Map(metas.map((meta) => [String(meta.collection?.data?.label || '').trim().toLowerCase(), meta]))

    return metas.map((meta) => {
        const imports = new Set(['Entity', 'Column', 'PrimaryGeneratedColumn', 'PrimaryColumn', 'Index'])
        const lines = []

        meta.fields.forEach((field, index) => {
            const propertyName = toCamelCase(field.name, `field${index + 1}`)
            const columnName = meta.columnNameByFieldId.get(field.id) || toSnakeCase(field.name, `column_${index + 1}`)
            const dbTypeName = String(field.type || 'varchar').toLowerCase()
            const tsType = mapToTsType(field.type)

            if (field.primaryKey) {
                if (field.autoIncrement) {
                    lines.push(`  @PrimaryGeneratedColumn()`)
                } else {
                    lines.push(`  @PrimaryColumn({ name: '${columnName}', type: '${dbTypeName}' })`)
                }
            } else {
                const options = [`name: '${columnName}'`, `type: '${dbTypeName}'`]
                if (field.nullable) options.push('nullable: true')
                if (field.unique) options.push('unique: true')
                if (field.defaultValue !== undefined && field.defaultValue !== null && String(field.defaultValue).trim() !== '') {
                    options.push(`default: ${JSON.stringify(String(field.defaultValue))}`)
                }
                if (field.typeParams && ['varchar', 'char'].includes(dbTypeName)) {
                    const len = Number.parseInt(String(field.typeParams), 10)
                    if (Number.isFinite(len) && len > 0) options.push(`length: ${len}`)
                }
                if (field.typeParams && dbTypeName === 'decimal') {
                    const [precision, scale] = String(field.typeParams).split(',').map((part) => Number.parseInt(part.trim(), 10))
                    if (Number.isFinite(precision)) options.push(`precision: ${precision}`)
                    if (Number.isFinite(scale)) options.push(`scale: ${scale}`)
                }

                if (field.index) {
                    lines.push(`  @Index()`)
                }
                lines.push(`  @Column({ ${options.join(', ')} })`)
            }

            lines.push(`  ${propertyName}${field.nullable ? '?' : ''}: ${tsType};`)
            lines.push('')

            if (field.foreignKey && field.referencesTable && (field.referencesColumn || field.referencesColumnId)) {
                const refMeta = byLabel.get(String(field.referencesTable).trim().toLowerCase())
                if (refMeta) {
                    imports.add('ManyToOne')
                    imports.add('JoinColumn')
                    const relationProp = toCamelCase(refMeta.className, 'relation')
                    const onDelete = normalizeAction(field.onDelete)
                    const onUpdate = normalizeAction(field.onUpdate)
                    lines.push(`  @ManyToOne(() => ${refMeta.className}, { onDelete: '${onDelete}', onUpdate: '${onUpdate}' })`)
                    lines.push(`  @JoinColumn({ name: '${columnName}' })`)
                    lines.push(`  ${relationProp}${field.nullable ? '?' : ''}: ${refMeta.className};`)
                    lines.push('')
                }
            }
        })

        imports.delete('PrimaryGeneratedColumn')
        if (!meta.fields.some((field) => field.primaryKey && field.autoIncrement)) imports.delete('PrimaryGeneratedColumn')
        if (!meta.fields.some((field) => field.primaryKey && !field.autoIncrement)) imports.delete('PrimaryColumn')
        if (!meta.fields.some((field) => !field.primaryKey)) imports.delete('Column')
        if (!meta.fields.some((field) => field.index)) imports.delete('Index')
        if (!Array.from(lines).some((line) => line.includes('@ManyToOne'))) {
            imports.delete('ManyToOne')
            imports.delete('JoinColumn')
        }

        const importLine = `import { ${Array.from(imports).join(', ')} } from 'typeorm';`

        const body = lines.join('\n').trimEnd()
        return `${importLine}

@Entity({ name: '${meta.tableName}' })
export class ${meta.className} {
${body ? `${body}\n` : ''}}
`
    }).join('\n\n')
}

