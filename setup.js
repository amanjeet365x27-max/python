const pool = require("./db");

(async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tournaments (
      name TEXT PRIMARY KEY,
      data JSONB
    );
  `);

  console.log("DB Ready");
  process.exit();
})();
