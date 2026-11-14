const mysql = require("mysql2/promise");

function createDatabasePool(environment = process.env) {
  const required = ["DB_HOST", "DB_NAME", "DB_USER"];
  const missing = required.filter(name => !environment[name]);

  if (missing.length) {
    return null;
  }

  const port = Number(environment.DB_PORT || 3306);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT deve ser um número entre 1 e 65535.");
  }

  return mysql.createPool({
    host: environment.DB_HOST,
    port,
    database: environment.DB_NAME,
    user: environment.DB_USER,
    password: environment.DB_PASSWORD || "",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: "utf8mb4",
    decimalNumbers: true
  });
}

module.exports = { createDatabasePool };
