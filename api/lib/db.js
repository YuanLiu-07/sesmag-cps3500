const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    isProduction && process.env.PGSSL !== "false"
      ? { rejectUnauthorized: false }
      : false,
});

function isTransientDbError(error) {
  const transientCodes = new Set([
    "57P01", // admin_shutdown
    "57P03", // cannot_connect_now
    "53300", // too_many_connections
    "53400", // configuration_limit_exceeded
    "08000", // connection_exception
    "08001", // sqlclient_unable_to_establish_sqlconnection
    "08003", // connection_does_not_exist
    "08006", // connection_failure
  ]);

  if (error && error.code && transientCodes.has(error.code)) {
    return true;
  }

  const message = `${error?.message || ""}`.toLowerCase();
  return message.includes("timeout") || message.includes("connection terminated");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function query(text, params) {
  const attempts = 3;
  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await pool.query(text, params);
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || i === attempts - 1) {
        throw error;
      }
      await sleep(120 * (i + 1));
    }
  }

  throw lastError;
}

module.exports = { pool, query };
