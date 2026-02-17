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

const ucfirst = (value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : ''

const mapToLaravelColumn = (field, dbType) => {
    const type = String(field?.type || '').toUpperCase()
    const params = String(field?.typeParams || '').trim()

    if (field.primaryKey && field.autoIncrement) return '$table->id()'

    if (type === 'INT' || type === 'INTEGER') return '$table->integer'
    if (type === 'BIGINT') return '$table->bigInteger'
    if (type === 'SMALLINT') return '$table->smallInteger'
    if (type === 'TINYINT') return '$table->tinyInteger'
    if (type === 'VARCHAR') {
        const len = Number.parseInt(params || '255', 10)
        return `$table->string`
    }
    if (type === 'CHAR') return '$table->char'
    if (type === 'TEXT' || type === 'LONGTEXT') return '$table->text'
    if (type === 'DECIMAL') return '$table->decimal'
    if (type === 'FLOAT' || type === 'DOUBLE' || type === 'REAL') return '$table->double'
    if (type === 'BOOLEAN') return '$table->boolean'
    if (type === 'DATE') return '$table->date'
    if (type === 'DATETIME' || type === 'TIMESTAMP') return '$table->timestamp'
    if (type === 'TIME') return '$table->time'
    if (type === 'JSON' || type === 'JSONB') return '$table->json'
    if (type === 'UUID') return '$table->uuid'
    if (type === 'BLOB' || type === 'BYTEA') return '$table->binary'
    if (type === 'ENUM') return '$table->enum'

    if (dbType === DB_TYPES.POSTGRESQL && type === 'SERIAL') return '$table->integer'
    if (dbType === DB_TYPES.POSTGRESQL && type === 'BIGSERIAL') return '$table->bigInteger'

    return '$table->string'
}

const formatDefault = (value) => {
    const raw = String(value ?? '').trim()
    if (!raw) return null
    if (raw.toUpperCase() === 'CURRENT_TIMESTAMP' || raw.toLowerCase() === 'now()') return '->useCurrent()'
    if (!Number.isNaN(Number(raw))) return `->default(${raw})`
    if (raw.toLowerCase() === 'true' || raw.toLowerCase() === 'false') return `->default(${raw.toLowerCase()})`
    return `->default('${raw.replace(/'/g, "\\'")}')`
}

export const generateLaravelMigrations = (schema, dbType) => {
    const collections = Array.isArray(schema?.collections) ? schema.collections : []
    const metas = collections.map((collection, index) => {
        const tableName = toSnakeCase(collection?.data?.label, `table_${index + 1}`)
        const fields = Array.isArray(collection?.data?.fields) ? collection.data.fields : []
        const fieldMap = new Map(fields.map((field, fieldIndex) => [field.id, toSnakeCase(field?.name, `column_${fieldIndex + 1}`)]))
        return { collection, tableName, fields, fieldMap }
    })

    const byLabel = new Map(metas.map((meta) => [String(meta.collection?.data?.label || '').trim().toLowerCase(), meta]))

    return metas.map((meta, index) => {
        const className = `Create${meta.tableName.split('_').map(ucfirst).join('')}Table`
        const fileName = `${new Date().toISOString().split('T')[0].replace(/-/g, '_')}_${String(index + 1).padStart(6, '0')}_create_${meta.tableName}_table.php`
        const bodyLines = []

        meta.fields.forEach((field, fieldIndex) => {
            const columnName = meta.fieldMap.get(field.id) || toSnakeCase(field?.name, `column_${fieldIndex + 1}`)
            const base = mapToLaravelColumn(field, dbType)
            let line = ''

            if (base === '$table->id()') {
                line = `            ${base};`
                bodyLines.push(line)
                return
            }

            if (base === '$table->decimal') {
                const [precision, scale] = String(field.typeParams || '10,2').split(',').map((part) => Number.parseInt(part.trim(), 10))
                line = `            ${base}('${columnName}', ${Number.isFinite(precision) ? precision : 10}, ${Number.isFinite(scale) ? scale : 2})`
            } else if (base === '$table->enum') {
                const values = Array.isArray(field.enumValues) && field.enumValues.length > 0
                    ? `[${field.enumValues.map((item) => `'${String(item).replace(/'/g, "\\'")}'`).join(', ')}]`
                    : "['value1', 'value2']"
                line = `            ${base}('${columnName}', ${values})`
            } else if (base === '$table->string' && String(field?.type || '').toUpperCase() === 'VARCHAR') {
                const len = Number.parseInt(String(field.typeParams || '255'), 10)
                line = `            ${base}('${columnName}', ${Number.isFinite(len) ? len : 255})`
            } else {
                line = `            ${base}('${columnName}')`
            }

            if (field.unsigned && dbType === DB_TYPES.MYSQL) line += '->unsigned()'
            if (field.nullable) line += '->nullable()'
            if (field.unique) line += '->unique()'
            if (field.index) line += '->index()'

            const defaultChain = formatDefault(field.defaultValue)
            if (defaultChain) line += defaultChain

            line += ';'
            bodyLines.push(line)

            if (field.primaryKey && !field.autoIncrement) {
                bodyLines.push(`            $table->primary('${columnName}');`)
            }

            if (field.foreignKey && field.referencesTable && (field.referencesColumn || field.referencesColumnId)) {
                const refMeta = byLabel.get(String(field.referencesTable).trim().toLowerCase())
                const refTable = refMeta ? refMeta.tableName : toSnakeCase(field.referencesTable, 'reference_table')
                const refCol = field.referencesColumnId && refMeta?.fieldMap.has(field.referencesColumnId)
                    ? refMeta.fieldMap.get(field.referencesColumnId)
                    : toSnakeCase(field.referencesColumn, 'id')

                let fk = `            $table->foreign('${columnName}')`
                fk += `->references('${refCol}')`
                fk += `->on('${refTable}')`
                if (field.onDelete) fk += `->onDelete('${String(field.onDelete).toLowerCase().replace(/\s+/g, ' ')}')`
                if (field.onUpdate) fk += `->onUpdate('${String(field.onUpdate).toLowerCase().replace(/\s+/g, ' ')}')`
                fk += ';'
                bodyLines.push(fk)
            }
        })

        const content = `// ${fileName}
<?php

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('${meta.tableName}', function (Blueprint $table) {
${bodyLines.join('\n')}
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('${meta.tableName}');
    }
};
`
        return content
    }).join('\n\n')
}

