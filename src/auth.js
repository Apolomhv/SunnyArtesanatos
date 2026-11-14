const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const accountTables = {
  artesao: "Artesao",
  cliente: "Cliente"
};

function getJwtSecret(environment = process.env) {
  const secret = environment.JWT_SECRET;
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    const error = new Error("JWT_SECRET não configurado (mínimo 32 bytes).");
    error.status = 503;
    throw error;
  }
  return secret;
}

function issueToken(account, type, environment = process.env) {
  return jwt.sign(
    { type },
    getJwtSecret(environment),
    { subject: String(account.cod), expiresIn: "1h" }
  );
}

function authenticate(pool, environment = process.env, requiredType) {
  return async (request, response, next) => {
    const authorization = request.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return response.status(401).json({ error: "Autenticação necessária." });
    }

    try {
      const claims = jwt.verify(match[1], getJwtSecret(environment));
      if (!accountTables[claims.type] || !/^\d+$/.test(claims.sub || "")) {
        return response.status(401).json({ error: "Token inválido." });
      }
      if (requiredType && claims.type !== requiredType) {
        return response.status(403).json({ error: "Esta conta não tem permissão para esta operação." });
      }
      if (!pool) {
        return response.status(503).json({ error: "Banco de dados não configurado." });
      }

      const [rows] = await pool.execute(
        `SELECT cod FROM ${accountTables[claims.type]} WHERE cod = ?`,
        [Number(claims.sub)]
      );
      if (!rows.length) {
        return response.status(401).json({ error: "Conta não encontrada ou removida." });
      }

      request.account = { cod: Number(claims.sub), type: claims.type };
      request.database = pool;
      next();
    } catch (error) {
      if (error.status === 503) {
        return response.status(503).json({ error: error.message });
      }
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return response.status(401).json({ error: "Token inválido ou expirado." });
      }
      next(error);
    }
  };
}

module.exports = { accountTables, authenticate, bcrypt, getJwtSecret, issueToken };
