const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.resolve(__dirname, "../app.db");
const db = new sqlite3.Database(dbPath);

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
    }

};

module.exports = dbService;
