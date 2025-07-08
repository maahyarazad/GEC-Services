const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../app.db");
const db = new sqlite3.Database(dbPath);

const safeWrite = async (query, params = []) => {
    const maxAttempts = 5;
    let attempt = 0;

    while (attempt < maxAttempts) {
        try {
            const result = await new Promise((resolve, reject) => {
                db.run(query, params, function (err) {
                    if (err) return reject(err);
                    resolve({ id: this.lastID });
                });
            });
            return result; // ✅ Exit loop and function on success
        } catch (err) {
            if (err.code === 'SQLITE_BUSY') {
                attempt++;
                await new Promise(resolve => setTimeout(resolve, 50));
            } else {
                throw err; // Don't retry other errors
            }
        }
    }

    throw new Error("Failed to write after retries");
};




const dbService = {
    create: (table, data) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;

        return new Promise((resolve, reject) => {
            db.run(sql, values, function (err) {
                if (err) return reject(err);
                resolve({ id: this.lastID });
            });
        });
    },

    findAll: (table) => {
        const sql = `SELECT * FROM ${table}`;
        return new Promise((resolve, reject) => {
            db.all(sql, [], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    findById: (table, id) => {
        const sql = `SELECT * FROM ${table} WHERE id = ?`;
        return new Promise((resolve, reject) => {
            db.get(sql, [id], (err, row) => {
                if (err) return reject(err);
                resolve(row);
            });
        });
    },

    update: (table, id, data) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const setClause = keys.map(key => `${key} = ?`).join(", ");
        const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

        return new Promise((resolve, reject) => {
            db.run(sql, [...values, id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
    },

    remove: (table, id) => {
        const sql = `DELETE FROM ${table} WHERE id = ?`;
        return new Promise((resolve, reject) => {
            db.run(sql, [id], function (err) {
                if (err) return reject(err);
                resolve({ changes: this.changes });
            });
        });
    },

    any: (table, column, pattern) => {
        const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${column} LIKE ?`;
        const param = `%${pattern}%`;

        return new Promise((resolve, reject) => {
            db.get(sql, [param], (err, row) => {
                if (err) return reject(err);
                resolve(row.count);
            });
        });
    },

    findByColumn: (table, column, pattern) => {
        const sql = `SELECT * FROM ${table} WHERE ${column} LIKE ?`;
        const param = `%${pattern}%`;

        return new Promise((resolve, reject) => {
            db.get(sql, [param], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    findExact: (table, column, pattern) => {
        const sql = `SELECT * FROM ${table} WHERE ${column} = ?`;
        const param = `${pattern}`;

        return new Promise((resolve, reject) => {
            db.get(sql, [param], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    countExact: (table, column, pattern) => {
        const sql = `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`;
        const param = `${pattern}`;

        return new Promise((resolve, reject) => {
            db.get(sql, [param], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },


    // Optional: alternative version using safeWrite for sync writes
    createSafe: async (table, data) => {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => "?").join(", ");
        const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`;

        try {
            await safeWrite(sql, values);
            return { status: true };
        } catch (err) {
            return { status: false, error: err.message };
        }
    },

    getTotalCount: (table, filters = {}) => {
        return new Promise((resolve, reject) => {
            const keys = Object.keys(filters);
            const whereClause = keys.length
            ? "WHERE " + keys.map(key => `${key} LIKE ?`).join(" AND ")
            : "";
            const params = keys.map(key => `%${filters[key]}%`);

            const sql = `SELECT COUNT(*) AS count FROM ${table} ${whereClause}`;

            db.get(sql, params, (err, row) => {
            if (err) return reject(err);
            resolve(row.count);
            });
        });
    }

    ,
    getPaginatedFilteredData: (
        table,
        filters = {},
        page = 0,
        pageSize = 10,
        sortField = null,
        sortOrder = 'ASC' // 'ASC' or 'DESC'
    ) => {
        const offset = page * pageSize;

        // Build WHERE clause dynamically for filters with LIKE
        const filterKeys = Object.keys(filters);
        const whereClause = filterKeys.length
            ? "WHERE " + filterKeys.map(key => `${key} LIKE ?`).join(" AND ")
            : "";

        const params = filterKeys.map(key => `%${filters[key]}%`);

        // Validate sortField and sortOrder to avoid SQL injection
        const orderClause =
            sortField && /^[a-zA-Z0-9_]+$/.test(sortField) && /^(ASC|DESC)$/i.test(sortOrder)
                ? `ORDER BY ${sortField} ${sortOrder.toUpperCase()}`
                : "";

        const sql = `
            SELECT * FROM ${table}
            ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        `;

        return new Promise((resolve, reject) => {
            db.all(sql, [...params, pageSize, offset], (err, rows) => {
                if (err) return reject(err);
                resolve(rows);
            });
        });
    },

    QuerySqlConverter: async (query, table_name) => {
        const {
            page = "1", pageSize = "10", sortField, sortOrder, ...queryFilters
        } = query;

        const pageNumber = Math.max(0, parseInt(page, 10) - 1);
        const limit = parseInt(pageSize, 10);

        // Extract filters sent as filter_<field>=value
        const filters = {};
        Object.entries(queryFilters).forEach(([key, value]) => {
            if (key.startsWith('filter_')) {
                const field = key.replace('filter_', '');
                if (value !== undefined && value !== "") {
                    filters[field] = value;
                }
            }
        });

        const data = await dbService.getPaginatedFilteredData(
            table_name,
            filters,
            pageNumber,
            limit,
            sortField,
            sortOrder
        );
        return { filters, data };
    }
    

};

module.exports = dbService;
