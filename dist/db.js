'use strict';
const Pool = require('pg').Pool;
const dotenv = require("dotenv");
dotenv.config();
const pool = new Pool({
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    port: process.env.PGPORT,
    database: process.env.PGDATABASE,
    ssl: true
});
module.exports = pool;
