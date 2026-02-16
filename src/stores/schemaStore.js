import { defineStore } from 'pinia'
import { useVueFlow } from '@vue-flow/core'
import { useStorage } from '@vueuse/core'

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

        let typeDef = `{ type: ${field.type === 'ObjectId' ? 'Schema.Types.ObjectId' : field.type}`;

        if (field.ref) typeDef += `, ref: '${field.ref}'`;
        if (field.required) typeDef += `, required: true`;
        if (field.unique) typeDef += `, unique: true`;
        if (field.index) typeDef += `, index: true`;

        if (field.default) {
            if (field.default === 'null') {
                typeDef += `, default: null`;
            } else {
                const isRawValue = field.type === 'Number' ||
                    field.type === 'Boolean' ||
                    field.type === 'Array' ||
                    field.type === 'Object' ||
                    String(field.default).trim().startsWith('[') ||
                    String(field.default).trim().startsWith('{');

                typeDef += `, default: ${isRawValue ? field.default : `'${field.default}'`}`;
            }
        }

        if (field.enum && field.type === 'String' && String(field.enum).trim().length > 0) {
            const enumValues = String(field.enum).split(',').map(v => `'${v.trim()}'`).join(', ');
            typeDef += `, enum: [${enumValues}]`;
        }

        typeDef += " }";

        code += `${indent}${field.name}: ${typeDef},\n`;
    });

    return code;
}

export const useSchemaStore = defineStore('schema', {
    state: () => useStorage('mongo-architect-schema', {
        collections: [
            {
                id: '1',
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
            { id: 'e1-2', source: '1', target: '2', sourceHandle: 'f1', targetHandle: 'f6', animated: true, style: { stroke: '#10b981' } }
        ],
        selectedItemId: null,
        selectedItemType: null,
        selectedCollectionId: null,
        clipboard: null,
    }),
    getters: {
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

            // Build Schema Options
            let optionsObj = {};
            if (col.data.timestampsEnabled) {
                if (col.data.createdAtName || col.data.updatedAtName) {
                    optionsObj.timestamps = {};
                    if (col.data.createdAtName) optionsObj.timestamps.createdAt = col.data.createdAtName;
                    if (col.data.updatedAtName) optionsObj.timestamps.updatedAt = col.data.updatedAtName;
                } else {
                    optionsObj.timestamps = true;
                }
            }
            const optionsStr = Object.keys(optionsObj).length > 0 ? `, ${JSON.stringify(optionsObj, null, 2).replace(/"([^"]+)":/g, '$1:')}` : '';

            code += `const ${col.data.label}Schema = new Schema({\n`;
            code += generateSchemaCode(col.data.fields);
            code += `}${optionsStr});\n\n`;
            code += `const ${col.data.label} = mongoose.model('${col.data.label}', ${col.data.label}Schema);\n\n`;
            return code;
        },
        mongooseSchemaCode: (state) => {
            let code = "const mongoose = require('mongoose');\nconst { Schema } = mongoose;\n\n";
            state.collections.forEach(col => {
                // Build Schema Options
                let optionsObj = {};
                if (col.data.timestampsEnabled) {
                    if (col.data.createdAtName || col.data.updatedAtName) {
                        optionsObj.timestamps = {};
                        if (col.data.createdAtName) optionsObj.timestamps.createdAt = col.data.createdAtName;
                        if (col.data.updatedAtName) optionsObj.timestamps.updatedAt = col.data.updatedAtName;
                    } else {
                        optionsObj.timestamps = true;
                    }
                }
                const optionsStr = Object.keys(optionsObj).length > 0 ? `, ${JSON.stringify(optionsObj, null, 2).replace(/"([^"]+)":/g, '$1:')}` : '';

                code += `const ${col.data.label}Schema = new Schema({\n`;
                code += generateSchemaCode(col.data.fields);
                code += `}${optionsStr});\n\n`;
                code += `const ${col.data.label} = mongoose.model('${col.data.label}', ${col.data.label}Schema);\n\n`;
            });
            return code;
        }
    },
    actions: {
        selectItem(id, type, collectionId = null) {
            this.selectedItemId = id
            this.selectedItemType = type
            this.selectedCollectionId = collectionId
        },
        updateCollectionProps(id, newProps) {
            const collection = this.collections.find(c => c.id === id)
            if (collection) {
                Object.assign(collection.data, newProps)
            }
        },
        updateFieldProps(collectionId, fieldId, newProps) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                const result = findFieldRecursively(collection.data.fields, fieldId)
                if (result) {
                    Object.assign(result.field, newProps)
                }
            }
        },
        addCollection(collection) {
            this.collections.push(collection)
        },
        updateCollectionPosition(id, position) {
            const index = this.collections.findIndex(c => c.id === id)
            if (index !== -1) {
                this.collections[index].position = position
            }
        },
        addField(collectionId, field) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                collection.data.fields.push(field)
            }
        },
        addChildField(collectionId, parentFieldId, field) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
                const result = findFieldRecursively(collection.data.fields, parentFieldId)
                if (result) {
                    if (!result.field.children) result.field.children = []
                    result.field.children.push(field)
                }
            }
        },
        removeField(collectionId, fieldId) {
            const collection = this.collections.find(c => c.id === collectionId)
            if (collection) {
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

                if (this.selectedItemId === fieldId) {
                    this.selectItem(null, null)
                }
            }
        },
        removeCollection(id) {
            this.collections = this.collections.filter(c => c.id !== id)
            this.edges = this.edges.filter(e => e.source !== id && e.target !== id)

            if (this.selectedItemId === id) {
                this.selectItem(null, null)
            }
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
                const [movedItem] = targetList.splice(oldIndex, 1)
                targetList.splice(newIndex, 0, movedItem)
            }
        },
        removeEdge(id) {
            this.edges = this.edges.filter(e => e.id !== id)
            if (this.selectedItemId === id) {
                this.selectItem(null, null)
            }
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
        }
    }
})
