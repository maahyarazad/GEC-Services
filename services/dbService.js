const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.resolve(__dirname, "../app.db");
const db = new Database(
  dbPath,
  process.env.ENVIRONMENT === "PRODUCTION" ? {} : { verbose: console.log }
);

const paramBuilder = (filters) => {
  const filterKeys = Object.keys(filters);
  const whereParts = [];
  const params = [];

  filterKeys.forEach((key) => {
    const filterValue = filters[key];
    const isNumeric =
      filterValue !== null &&
      filterValue !== "" &&
      !isNaN(filterValue) &&
      !isNaN(parseFloat(filterValue));

    switch (true) {
      case key === "r.event":
        whereParts.push(`${key} = ?`);
        params.push(`${filterValue}`);
        break;
      case filterValue === "isEmpty":
        whereParts.push(`(${key} = '' OR ${key} IS NULL)`);
        break;
      case filterValue === "isNotEmpty":
        whereParts.push(`(${key} <> '' AND ${key} IS NOT NULL)`);
        break;
      case isNumeric:
        whereParts.push(`${key} = ?`);
        params.push(Number(filterValue));
        break;
      case filterValue != null && filterValue !== "":
        whereParts.push(`${key} LIKE ?`);
        params.push(`%${filterValue}%`);
        break;
      default:
        break;
    }
  });

  return [whereParts, params];
};

const dbService = {
  getDB: () => db,

  createBulk: (table, rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return [];

    const keys = Object.keys(rows[0]);
    const placeholders = "(" + keys.map(() => "?").join(", ") + ")";
    const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES ${rows
      .map(() => placeholders)
      .join(", ")}`;
    const values = rows.flatMap(Object.values);

    const stmt = db.prepare(sql);
    const info = stmt.run(...values);
    return { lastID: info.lastInsertRowid, changes: info.changes };
  },

  create: (table, data) => {
    try {
      const keys = Object.keys(data);
      const values = Object.values(data).map((value) => {
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      });
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table} (${keys.join(
        ", "
      )}) VALUES (${placeholders})`;

      const stmt = db.prepare(sql);
      const info = stmt.run(...values);

      return { id: info.lastInsertRowid, status: true };
    } catch (error) {
      // You can log the error here if you want
      console.error(`${Date.now()} - DB insert error:`, error);
      return { status: false, error: error.message || error.toString() };
    }
  },

  findAll: (table) => {
    const sql = `SELECT * FROM ${table}`;
    const stmt = db.prepare(sql);
    return stmt.all();
  },

  findAllQueryFilter: (table, filters = {}) => {
    const pragmaSql = `PRAGMA table_info(${table});`;
    const columns = db.prepare(pragmaSql).all();

    const softDeleteColumns = ["isDeleted", "archive", "archived", "deleted"];
    const foundColumn = columns.find((col) =>
      softDeleteColumns.includes(col.name)
    );

    let sql = foundColumn
      ? `SELECT * FROM ${table} WHERE (${foundColumn.name} != 1 OR ${foundColumn.name} IS NULL)`
      : `SELECT * FROM ${table}`;

    const filterKeys = Object.keys(filters);
    if (filterKeys.length > 0) {
      const filterConditions = filterKeys
        .map((key) => `${key} = @${key}`)
        .join(" AND ");
      sql += foundColumn
        ? ` AND ${filterConditions}`
        : ` WHERE ${filterConditions}`;
    }

    const stmt = db.prepare(sql);
    return stmt.all(filters);
  },

  findById: (table, id) => {
    const sql = `SELECT * FROM ${table} WHERE id = ?`;
    return db.prepare(sql).get(id);
  },

  updateWhere: (table, updates, where) => {
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error("No update fields provided");
    }

    const setClause = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");

    const setValues = Object.values(updates).map((value) => {
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    });

    const whereClause = Object.keys(where)
      .map((key) => `${key} = ?`)
      .join(" AND ");
    const whereValues = Object.values(where);

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    const stmt = db.prepare(sql);

    const info = stmt.run(...setValues, ...whereValues);
    return { changes: info.changes };
  },

  update: (table, id, data) => {
    const keys = Object.keys(data);
    const values = Object.values(data).map((value) => {
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    });
    const setClause = keys.map((key) => `${key} = ?`).join(", ");
    const sql = `UPDATE ${table} SET ${setClause} WHERE id = ?`;

    const stmt = db.prepare(sql);
    const info = stmt.run(...values, id);
    return { changes: info.changes };
  },

  remove: (table, id) => {
    const sql = `DELETE FROM ${table} WHERE id = ?`;
    const stmt = db.prepare(sql);
    const info = stmt.run(id);
    return { changes: info.changes };
  },

  any: (table, column, pattern) => {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${column} LIKE ?`;
    const param = `%${pattern}%`;
    const row = db.prepare(sql).get(param);
    return row.count;
  },

  findByColumn: (table, column, pattern) => {
    const sql = `SELECT * FROM ${table} WHERE ${column} LIKE ?`;
    const param = `%${pattern}%`;
    return db.prepare(sql).all(param);
  },

  findExactWithConditions: (table, conditions) => {
    const columns = Object.keys(conditions);
    const values = [];

    const whereClause = columns
      .map((col) => {
        if (conditions[col] === "IS NOT NULL") {
          return `${col} IS NOT NULL`;
        } else {
          values.push(conditions[col]);
          return `${col} = ?`;
        }
      })
      .join(" AND ");

    const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;
    return db.prepare(sql).all(...values);
  },

  findExact: (table, column, pattern) => {
    if (pattern === undefined || pattern === null) {
      throw new Error("Pattern must be defined");
    }

    if (typeof pattern === "boolean") {
      const sql = `SELECT * FROM ${table} WHERE ${column} = ?`;
      return db.prepare(sql).all(pattern ? 1 : 0);
    }

    // Handle other types (string, number, bigint, buffer)
    if (
      typeof pattern !== "string" &&
      typeof pattern !== "number" &&
      typeof pattern !== "bigint" &&
      !Buffer.isBuffer(pattern)
    ) {
      throw new Error("Invalid pattern type passed to countExact");
    }

    const sql = `SELECT * FROM ${table} WHERE ${column} = ?`;
    return db.prepare(sql).all(pattern);
  },

  countExact: (table, column, pattern) => {
    if (pattern === undefined || pattern === null) {
      throw new Error("Pattern must be defined");
    }

    if (typeof pattern === "boolean") {
      const sql = `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`;
      const row = db.prepare(sql).get(pattern ? 1 : 0);
      return row.count;
    }

    // Handle other types (string, number, bigint, buffer)
    if (
      typeof pattern !== "string" &&
      typeof pattern !== "number" &&
      typeof pattern !== "bigint" &&
      !Buffer.isBuffer(pattern)
    ) {
      throw new Error("Invalid pattern type passed to countExact");
    }

    const sql = `SELECT COUNT(*) AS count FROM ${table} WHERE ${column} = ?`;
    const row = db.prepare(sql).get(pattern);
    return row.count;
  },

  selectDistinctColumnQuery: (table, column) => {
    if (!/^[a-zA-Z0-9_]+$/.test(column)) {
      throw new Error("Invalid column name");
    }
    const sql = `SELECT DISTINCT ${column} FROM ${table}`;
    const rows = db.prepare(sql).all();
    return rows.map((r) => r[column]);
  },

  getTotalCount: (table, filters = {}) => {
    const [whereParts, params] = paramBuilder(filters);
    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";
    const sql = `SELECT COUNT(*) AS count FROM ${table} ${whereClause}`;
    const row = db.prepare(sql).get(...params);
    return row.count;
  },

  getPaginatedFilteredData: (
    table,
    filters = {},
    jsonFilters = [],
    page = 0,
    pageSize = 10,
    sortField = null,
    sortOrder = "ASC",
    leftJoin = {},
    columns = ["*"]
  ) => {
    const offset = page * pageSize;
    const [whereParts, params] = paramBuilder(filters);

    jsonFilters.forEach((f) => {
      whereParts.push(`json_extract(${f.column}, ?) LIKE ?`);
      params.push(f.path, `%${f.value}%`);
    });

    const whereClause = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    let orderClause = "";
    if (sortField) {
      if (sortField.startsWith("payload_")) {
        const jsonPath = sortField.replace("payload_", "").split("_").join(".");
        orderClause = `ORDER BY json_extract(payload, '$.${jsonPath}') ${sortOrder.toUpperCase()}`;
      } else if (
        /^[a-zA-Z0-9_]+$/.test(sortField) &&
        /^(ASC|DESC)$/i.test(sortOrder)
      ) {
        orderClause = `ORDER BY ${sortField} ${sortOrder.toUpperCase()}`;
      }
    }

    const joinClause = Object.keys(leftJoin).length
      ? `LEFT JOIN ${leftJoin.table} ON ${leftJoin.on}`
      : "";

    const columnsClause =
      Array.isArray(columns) && columns.length > 0 ? columns.join(", ") : "*";

    const sql = `
            SELECT ${columnsClause} FROM ${table}
            ${joinClause}
            ${whereClause}
            ${orderClause}
            LIMIT ? OFFSET ?
        `;

    const stmt = db.prepare(sql);
    return stmt.all(...params, pageSize, offset);
  },

  QuerySqlConverter: (query, table_name, leftJoin = {}, columns) => {
    const {
      page = "1",
      pageSize = "10",
      sortField,
      sortOrder,
      ...queryFilters
    } = query;

    const pageNumber = Math.max(0, parseInt(page, 10) - 1);
    const limit = parseInt(pageSize, 10);

    const filters = {};
    const jsonFilters = [];

    Object.entries(queryFilters).forEach(([key, value]) => {
    //   if (!key.startsWith("filter_")) return;

      let field = key.replace("filter_", "");

      if (field.startsWith("payload_")) {
        const jsonPath = field.replace("payload_", "").split("_").join(".");
        jsonFilters.push({
          column: "payload",
          path: `$.${jsonPath}`,
          value,
        });
      } else {
        if (value === undefined || value === "") return;

        if (Object.keys(leftJoin).length !== 0) {
          const alias = table_name[table_name.length - 1];
          filters[`${alias}.${field}`] = value;
        } else {
          filters[field] = value;
        }
      }
    });

    const data = dbService.getPaginatedFilteredData(
      table_name,
      filters,
      jsonFilters,
      pageNumber,
      limit,
      sortField,
      sortOrder,
      leftJoin,
      columns
    );

    return { filters, jsonFilters, data };
  },

  createRegistrationKeys: (registration_config_id, keys) => {
    if (!Array.isArray(keys) || keys.length === 0) return [];

    const placeholders = keys.map(() => "(?, ?)").join(", ");
    const values = keys.flatMap((key) => [registration_config_id, key]);

    const sql = `
            INSERT INTO registration_keys (registration_config_id, key)
            VALUES ${placeholders}
        `;

    const stmt = db.prepare(sql);
    const info = stmt.run(...values);
    return { inserted: keys.length };
  },

  insertWithKeys: (table_name, registration_data, code_list) => {
    const insertTransaction = db.transaction(() => {
      const keys = Object.keys(registration_data);

      const values = Object.values(registration_data).map((value) => {
        if (typeof value === "boolean") {
          return value ? 1 : 0;
        }
        return value;
      });

      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table_name} (${keys.join(
        ", "
      )}) VALUES (${placeholders})`;

      const info = db.prepare(sql).run(...values);
      const registration_config_id = info.lastInsertRowid;

      if (code_list.length > 0) {
        const stmt = db.prepare(`
                    INSERT INTO registration_keys (registration_config_id, key, memberId) 
                    VALUES (?, ?, ?)
                `);

        for (const item of code_list) {
          stmt.run(registration_config_id, item.key, item.memberId);
        }
      }

      return registration_config_id;
    });

    try {
      const id = insertTransaction();
      return { id };
    } catch (err) {
      throw err;
    }
  },

  findByConditions: (table, conditions) => {
    const keys = Object.keys(conditions);

    const values = Object.values(conditions).map((value) => {
      if (typeof value === "boolean") {
        return value ? 1 : 0;
      }
      return value;
    });

    if (keys.length === 0) {
      throw new Error("At least one condition is required.");
    }

    const whereClause = keys.map((key) => `${key} = ?`).join(" AND ");
    const sql = `SELECT * FROM ${table} WHERE ${whereClause}`;

    return db.prepare(sql).all(...values);
  },

  registration_stat: () => {
    const query = `
            SELECT 
                event,
                COUNT(*) AS total_count,
                SUM(CASE WHEN metadata_modifiedAt IS NOT NULL THEN 1 ELSE 0 END) AS modified_count,
                SUM(CASE WHEN metadata_modifiedAt IS NULL THEN 1 ELSE 0 END) AS null_count
            FROM registration
            GROUP BY event;
        `;

    return db.prepare(query).all();
  },

  registration_config_list: () => {
    const query = `SELECT page, title FROM registration_config WHERE archived = 0`;
    return db.prepare(query).all();
  },

  registration_config_auto_register: () => {
    const query = `SELECT * FROM registration_config WHERE event_date IS NOT NULL AND event_date = date('now');`;
    return db.prepare(query).all();
  },

  countExactWithConditions: (table, conditions) => {
    const keys = Object.keys(conditions);

    if (keys.length === 0) {
      throw new Error("At least one condition is required.");
    }

    const whereParts = [];
    const values = [];

    for (const [key, condition] of Object.entries(conditions)) {
      if (typeof condition === "object" && condition.op) {
        if (condition.op.toUpperCase() === "BETWEEN") {
          if (!Array.isArray(condition.value) || condition.value.length !== 2) {
            throw new Error(
              `BETWEEN requires an array with 2 values for ${key}`
            );
          }
          whereParts.push(`${key} BETWEEN ? AND ?`);
          values.push(condition.value[0], condition.value[1]);
        } else {
          whereParts.push(`${key} ${condition.op} ?`);
          values.push(condition.value);
        }
      } else {
        whereParts.push(`${key} = ?`);
        values.push(condition);
      }
    }

    const whereClause = whereParts.join(" AND ");
    const sql = `SELECT count(*) as count FROM ${table} WHERE ${whereClause}`;

    const row = db.prepare(sql).get(...values);
    return row.count;
  },


  _QuerySqlConverter: (query, table_name, leftJoin = {}, columns) => {
  const {
    page = "1",
    pageSize = "10",
    sortField,
    sortOrder,
    filterField,
    filterOperator,
    filterValue,
    ...queryFilters
  } = query;

  const pageNumber = Math.max(0, parseInt(page, 10) - 1);
  const limit = parseInt(pageSize, 10);

  const filters = {};
  const jsonFilters = [];

  // ── Operator → SQL mapping ────────────────────────────────────────────────
  const operatorMap = {
    contains:   (col, val) => ({ clause: `${col} LIKE ?`,  value: `%${val}%` }),
    equals:     (col, val) => ({ clause: `${col} = ?`,     value: val }),
    startsWith: (col, val) => ({ clause: `${col} LIKE ?`,  value: `${val}%` }),
    endsWith:   (col, val) => ({ clause: `${col} LIKE ?`,  value: `%${val}` }),
    eq:         (col, val) => ({ clause: `${col} = ?`,     value: Number(val) }),
    neq:        (col, val) => ({ clause: `${col} != ?`,    value: Number(val) }),
    gt:         (col, val) => ({ clause: `${col} > ?`,     value: Number(val) }),
    gte:        (col, val) => ({ clause: `${col} >= ?`,    value: Number(val) }),
    lt:         (col, val) => ({ clause: `${col} < ?`,     value: Number(val) }),
    lte:        (col, val) => ({ clause: `${col} <= ?`,    value: Number(val) }),
    isEmpty:    (col)      => ({ clause: `(${col} IS NULL OR ${col} = '')`, value: null }),
    isNotEmpty: (col)      => ({ clause: `(${col} IS NOT NULL AND ${col} != '')`, value: null }),
  };

  // ── Parse filterField[] / filterOperator[] / filterValue[] arrays ─────────
  const advancedClauses = [];   // { clause: string, value: any }
  const fields    = [].concat(filterField    ?? []);
  const operators = [].concat(filterOperator ?? []);
  const values    = [].concat(filterValue    ?? []);

  fields.forEach((field, i) => {
    const operator = operators[i];
    const value    = values[i];
    if (!field || !operator) return;

    // Skip value-required operators when value is empty
    const noValueOps = ['isEmpty', 'isNotEmpty'];
    if (!noValueOps.includes(operator) && (value == null || value === '')) return;

    const alias = Object.keys(leftJoin).length
      ? `${table_name[table_name.length - 1]}.${field}`
      : field;

    const builder = operatorMap[operator];
    if (!builder) return;

    advancedClauses.push(builder(alias, value));
  });

  // ── Legacy filter_ flat keys (unchanged behaviour) ────────────────────────
  Object.entries(queryFilters).forEach(([key, value]) => {
    let field = key.replace("filter_", "");

    if (field.startsWith("payload_")) {
      const jsonPath = field.replace("payload_", "").split("_").join(".");
      jsonFilters.push({ column: "payload", path: `$.${jsonPath}`, value });
    } else {
      if (value === undefined || value === "") return;

      if (Object.keys(leftJoin).length !== 0) {
        const alias = table_name[table_name.length - 1];
        filters[`${alias}.${field}`] = value;
      } else {
        filters[field] = value;
      }
    }
  });

  return {
    pageNumber,
    limit,
    sortField,
    sortOrder,
    filters,       // legacy equality filters  → WHERE col = ?
    jsonFilters,   // payload JSON path filters
    advancedClauses, // new operator-aware filters → WHERE col LIKE ? etc.
  };
},


_getTotalCount: (table, filters = {}, advancedClauses = [], leftJoin = null) => {
  const [whereParts, params] = paramBuilder(filters);

  // Operator-aware clauses
  advancedClauses.forEach(({ clause, value }) => {
    whereParts.push(clause);
    if (value !== null) params.push(value);
  });

  const joinClause = leftJoin
    ? `LEFT JOIN ${leftJoin.table} ON ${leftJoin.on}`
    : "";

  const whereClause = whereParts.length
    ? `WHERE ${whereParts.join(" AND ")}`
    : "";

  const sql = `SELECT COUNT(*) AS count FROM ${table} ${joinClause} ${whereClause}`;
  const row = db.prepare(sql).get(...params);
  return row.count;
},

_getAll: (table, filters = {}, options = {}) => {
  const {
    columns = ["*"],
    leftJoin = null,
    advancedClauses = [],
    jsonFilters = [],
    sortField,
    sortOrder,
    pageNumber = 0,
    limit = 10,
  } = options;

  const [whereParts, params] = paramBuilder(filters);

  // Operator-aware filters (contains, eq, gt, etc.)
  advancedClauses.forEach(({ clause, value }) => {
    whereParts.push(clause);
    if (value !== null) params.push(value);
  });

  // JSON path filters (payload_xxx keys)
  jsonFilters.forEach(({ column, path, value }) => {
    whereParts.push(`JSON_EXTRACT(${column}, ?) = ?`);
    params.push(path, value);
  });

  const joinClause = leftJoin
    ? `LEFT JOIN ${leftJoin.table} ON ${leftJoin.on}`
    : "";

  const whereClause = whereParts.length
    ? `WHERE ${whereParts.join(" AND ")}`
    : "";

  const orderClause =
    sortField && sortOrder
      ? `ORDER BY ${sortField} ${sortOrder.toUpperCase() === "DESC" ? "DESC" : "ASC"}`
      : "";

  const paginationClause = `LIMIT ? OFFSET ?`;
  params.push(limit, pageNumber * limit);

  const sql = `
    SELECT ${columns.join(", ")}
    FROM ${table}
    ${joinClause}
    ${whereClause}
    ${orderClause}
    ${paginationClause}
  `;

  return db.prepare(sql).all(...params);
},

};





module.exports = dbService;
