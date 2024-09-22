// db.js
const { Pool } = require('pg');
import config from './constant'
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'Assignment_Nodejs',
    password: '112233',
    port: 5432,
});

export default pool
