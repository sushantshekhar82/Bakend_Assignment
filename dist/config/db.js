"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// db.js
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Assignment_Nodejs',
    password: '112233',
    port: 5432,
});
exports.default = pool;
