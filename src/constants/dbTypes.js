export const DB_TYPES = {
    MONGODB: 'MongoDB',
    MYSQL: 'MySQL',
    POSTGRESQL: 'PostgreSQL'
}

export const FIELD_TYPES = {
    [DB_TYPES.MONGODB]: [
        'String', 'Number', 'ObjectId', 'Date', 'Boolean', 'Array', 'Object', 'Map', 'Buffer', 'Mixed'
    ],
    [DB_TYPES.MYSQL]: [
        'INT', 'BIGINT', 'TINYINT', 'SMALLINT', 'DECIMAL', 'FLOAT', 'DOUBLE',
        'VARCHAR', 'TEXT', 'CHAR', 'LONGTEXT',
        'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR',
        'BOOLEAN', 'JSON', 'ENUM', 'BLOB'
    ],
    [DB_TYPES.POSTGRESQL]: [
        'INT', 'BIGINT', 'SMALLINT', 'DECIMAL', 'REAL', 'DOUBLE PRECISION', 'SERIAL', 'BIGSERIAL',
        'VARCHAR', 'TEXT', 'CHAR',
        'DATE', 'TIMESTAMP', 'TIME', 'INTERVAL',
        'BOOLEAN', 'JSON', 'JSONB', 'UUID', 'BYTEA', 'XML'
    ]
}

export const DEFAULT_FIELDS = {
    [DB_TYPES.MONGODB]: {
        name: '_id',
        type: 'ObjectId',
        key: true
    },
    [DB_TYPES.MYSQL]: {
        name: 'id',
        type: 'INT',
        primaryKey: true,
        autoIncrement: true
    },
    [DB_TYPES.POSTGRESQL]: {
        name: 'id',
        type: 'SERIAL',
        primaryKey: true
    }
}
