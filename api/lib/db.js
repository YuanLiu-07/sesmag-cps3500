const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    isProduction && process.env.PGSSL !== "false"
      ? { rejectUnauthorized: false }
      : false,
});

async function query(text, params) {
  return pool.query(text, params);
}

module.exports = { pool, query };
