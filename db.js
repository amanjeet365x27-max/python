const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// 🔥 AUTO CREATE TABLE
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        name TEXT PRIMARY KEY,
        data JSONB
      );
    `);
    console.log("DB Ready");
  } catch (err) {
    console.error("DB Error:", err);
  }
})();

module.exports = pool;
