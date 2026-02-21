/**
 * ApiBridge handles the communication between the UI and any backend adapter.
 * It provides a standardized interface for fetching and saving schema data.
 */
export const createApiBridge = (config = {}) => {
    const { baseUrl = '', headers = {} } = config;

    const request = async (endpoint, options = {}) => {
        const url = `${baseUrl}${endpoint}`;
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers,
                    ...options.headers,
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`ApiBridge Request Error [${endpoint}]:`, error);
            throw error;
        }
    };

    return {
        /**
         * Fetch the current schema from the backend.
         * Expects a JSON object matching the schemaStore state structure.
         */
        async fetchSchema() {
            return request('/api/schema');
        },

        /**
         * Save the entire schema state to the backend.
         */
        async saveSchema(payload) {
            return request('/api/sync', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        },

        /**
         * Save only the visual layout (node positions) to the backend.
         */
        async saveLayout(payload) {
            return request('/api/save-layout', {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        },

        /**
         * Fetch schema directly from a live database connection.
         * Useful for reverse engineering existing databases.
         */
        async fetchLiveDb(databaseId) {
            return request(`/api/live-db/${databaseId}`);
        },

        /**
         * Fetch list of available databases/migrations.
         */
        async fetchDatabases() {
            return request('/api/databases');
        }
    };
};
