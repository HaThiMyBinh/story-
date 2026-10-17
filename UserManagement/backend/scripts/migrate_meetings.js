// Additive US8 migration only: does not load demo data or modify uploads.
const mysql = require("mysql2/promise");
const fs = require("node:fs");
const path = require("node:path");
const { migrateMeetings } = require("../services/meetingsMigration");
async function main() {
  const file = path.join(__dirname, "../db_config.json");
  const cfg = fs.existsSync(file)
    ? JSON.parse(fs.readFileSync(file, "utf8"))
    : {};
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || cfg.host || "localhost",
    port: Number(process.env.DB_PORT || cfg.port || 3306),
    user: process.env.DB_USER || cfg.user || "root",
    password: process.env.DB_PASSWORD ?? cfg.password ?? "",
    database: process.env.DB_NAME || cfg.database || "user_management",
  });
  try {
    await migrateMeetings(conn);
    console.log(
      "US8 meeting tables and email log extensions are ready; existing records preserved.",
    );
  } finally {
    await conn.end();
  }
}
main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
