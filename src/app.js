const express = require("express");
const path = require("node:path");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { accountTables, authenticate, bcrypt, getJwtSecret, issueToken } = require("./auth");
const { createDatabasePool } = require("./database");
const { normalizeProductBody, validateAccount, validateProduct } = require("./validation");

const publicDirectory = path.join(__dirname, "..", "public");
const accountColumns = [
  "nome", "ddi", "ddd", "telefone", "email", "cep", "rua",
  "numero", "bairro", "cidade", "uf"
];
const accountSelect = accountColumns.join(", ");
const passwordCost = 12;
const productImageLimit = 60 * 1024;

function asyncRoute(handler) {
  return (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
}

function requireDatabase(pool) {
  if (!pool) {
    const error = new Error("Banco de dados não configurado.");
    error.status = 503;
    throw error;
  }
}

function validImageSignature(buffer, mimetype) {
  if (mimetype === "image/jpeg") {
    return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === "image/png") {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimetype === "image/gif") {
    return ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6));
  }
  if (mimetype === "image/webp") {
    return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  }
  return false;
}

function publicProduct(row) {
  return {
    cod: row.cod,
    nome: row.nome,
    descricao: row.descricao,
    preco_custo: row.preco_custo,
    estoque: row.estoque,
    artesao: row.artesao,
    artisanName: row.artisan_name,
    fotoUrl: `/api/produtos/${row.cod}/foto`
  };
}

function createApp(options = {}) {
  const pool = options.pool === undefined ? createDatabasePool() : options.pool;
  const environment = options.environment || process.env;
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: productImageLimit, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.mimetype)) {
        return callback(new Error("A foto deve ser JPEG, PNG, GIF ou WebP."));
      }
      callback(null, true);
    }
  });
  const accountLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false
  });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) => response.json({ status: "ok" }));
  app.get("/api/health/database", asyncRoute(async (_request, response) => {
    requireDatabase(pool);
    await pool.query("SELECT 1");
    response.json({ status: "ok" });
  }));

  for (const [type, table] of Object.entries(accountTables)) {
    const route = type === "artesao" ? "/api/artesaos" : "/api/clientes";

    app.post(route, accountLimiter, asyncRoute(async (request, response) => {
      const body = request.body || {};
      const errors = validateAccount(body, { includePassword: true });
      if (errors.length) return response.status(400).json({ error: "Dados inválidos.", details: errors });
      requireDatabase(pool);
      getJwtSecret(environment);

      const values = accountColumns.map(field => {
        if (field === "email") return body.email.trim().toLowerCase();
        if (field === "uf") return body.uf.toUpperCase();
        return body[field];
      });
      const passwordHash = await bcrypt.hash(body.senha, passwordCost);
      const placeholders = accountColumns.map(() => "?").join(", ");
      const [result] = await pool.execute(
        `INSERT INTO ${table} (${accountColumns.join(", ")}, password_hash) VALUES (${placeholders}, ?)`,
        [...values, passwordHash]
      );
      const account = { cod: result.insertId };
      const token = issueToken(account, type, environment);
      response.status(201).json({ cod: account.cod, tipo: type, token });
    }));

    const auth = authenticate(pool, environment, type);
    if (type === "artesao") {
      app.get(`${route}/me/produtos`, auth, asyncRoute(async (request, response) => {
        requireDatabase(pool);
        const [rows] = await pool.execute(
          `SELECT p.cod, p.nome, p.descricao, p.preco_custo, p.estoque, p.artesao,
                  a.nome AS artisan_name
           FROM Produto p JOIN Artesao a ON a.cod = p.artesao
           WHERE p.artesao = ? ORDER BY p.cod DESC`,
          [request.account.cod]
        );
        response.json(rows.map(publicProduct));
      }));
    }

    app.get(`${route}/me`, auth, asyncRoute(async (request, response) => {
      requireDatabase(pool);
      const [rows] = await pool.execute(
        `SELECT cod, ${accountSelect} FROM ${table} WHERE cod = ?`,
        [request.account.cod]
      );
      if (!rows.length) return response.status(404).json({ error: "Conta não encontrada." });
      response.json(rows[0]);
    }));

    app.patch(`${route}/me`, auth, asyncRoute(async (request, response) => {
      const body = request.body || {};
      const errors = validateAccount(body, { partial: true, includePassword: true });
      if (!Object.keys(body).length) errors.push("Informe ao menos um campo para atualizar.");
      if (errors.length) return response.status(400).json({ error: "Dados inválidos.", details: errors });
      requireDatabase(pool);

      const fields = [];
      const values = [];
      for (const field of accountColumns) {
        if (body[field] !== undefined) {
          fields.push(`${field} = ?`);
          values.push(field === "email"
            ? body[field].trim().toLowerCase()
            : field === "uf" ? body[field].toUpperCase() : body[field]);
        }
      }
      if (body.senha !== undefined) {
        fields.push("password_hash = ?");
        values.push(await bcrypt.hash(body.senha, passwordCost));
      }

      values.push(request.account.cod);
      const [result] = await pool.execute(
        `UPDATE ${table} SET ${fields.join(", ")} WHERE cod = ?`,
        values
      );
      if (!result.affectedRows) return response.status(404).json({ error: "Conta não encontrada." });
      response.json({ message: "Conta atualizada." });
    }));

    app.delete(`${route}/me`, auth, asyncRoute(async (request, response) => {
      requireDatabase(pool);
      const [result] = await pool.execute(`DELETE FROM ${table} WHERE cod = ?`, [request.account.cod]);
      if (!result.affectedRows) return response.status(404).json({ error: "Conta não encontrada." });
      response.status(204).end();
    }));
  }

  app.post("/api/auth/login", accountLimiter, asyncRoute(async (request, response) => {
    const { tipo, email, senha } = request.body || {};
    if (!accountTables[tipo] || typeof email !== "string" || typeof senha !== "string") {
      return response.status(400).json({ error: "Informe tipo, email e senha válidos." });
    }
    requireDatabase(pool);
    getJwtSecret(environment);

    const [rows] = await pool.execute(
      `SELECT cod, password_hash FROM ${accountTables[tipo]} WHERE email = ?`,
      [email.trim().toLowerCase()]
    );
    if (!rows.length || !rows[0].password_hash || !(await bcrypt.compare(senha, rows[0].password_hash))) {
      return response.status(401).json({ error: "E-mail ou senha incorretos." });
    }

    const token = issueToken(rows[0], tipo, environment);
    response.json({ cod: rows[0].cod, tipo, token });
  }));

  app.get("/api/produtos", asyncRoute(async (request, response) => {
    requireDatabase(pool);
    const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 100);
    const offset = Math.max(Number.parseInt(request.query.offset, 10) || 0, 0);
    const [rows] = await pool.execute(
      `SELECT p.cod, p.nome, p.descricao, p.preco_custo, p.estoque, p.artesao,
              a.nome AS artisan_name
       FROM Produto p JOIN Artesao a ON a.cod = p.artesao
       ORDER BY p.cod DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );
    response.json(rows.map(publicProduct));
  }));

  app.get("/api/produtos/:cod/foto", asyncRoute(async (request, response) => {
    requireDatabase(pool);
    const cod = Number(request.params.cod);
    if (!Number.isSafeInteger(cod) || cod < 1) return response.status(400).json({ error: "Código inválido." });
    const [rows] = await pool.execute("SELECT foto FROM Produto WHERE cod = ?", [cod]);
    if (!rows.length) return response.status(404).json({ error: "Produto não encontrado." });
    const image = rows[0].foto;
    const mimetype = ["image/jpeg", "image/png", "image/gif", "image/webp"]
      .find(type => validImageSignature(image, type));
    if (!mimetype) return response.status(500).json({ error: "Imagem armazenada inválida." });
    response.type(mimetype).set("X-Content-Type-Options", "nosniff").send(image);
  }));

  app.get("/api/produtos/:cod", asyncRoute(async (request, response) => {
    requireDatabase(pool);
    const cod = Number(request.params.cod);
    if (!Number.isSafeInteger(cod) || cod < 1) return response.status(400).json({ error: "Código inválido." });
    const [rows] = await pool.execute(
      `SELECT p.cod, p.nome, p.descricao, p.preco_custo, p.estoque, p.artesao,
              a.nome AS artisan_name
       FROM Produto p JOIN Artesao a ON a.cod = p.artesao
       WHERE p.cod = ?`,
      [cod]
    );
    if (!rows.length) return response.status(404).json({ error: "Produto não encontrado." });
    response.json(publicProduct(rows[0]));
  }));

  app.post("/api/produtos", authenticate(pool, environment, "artesao"), upload.single("foto"), asyncRoute(async (request, response) => {
    const body = normalizeProductBody(request.body || {});
    const errors = validateProduct(body);
    if (!request.file) errors.push("Foto do produto obrigatória.");
    else if (!validImageSignature(request.file.buffer, request.file.mimetype)) errors.push("Conteúdo da foto inválido.");
    if (errors.length) return response.status(400).json({ error: "Dados inválidos.", details: errors });
    requireDatabase(pool);

    const [result] = await pool.execute(
      `INSERT INTO Produto (nome, descricao, preco_custo, foto, estoque, artesao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        body.nome.trim(),
        body.descricao.trim(),
        body.preco_custo,
        request.file.buffer,
        body.estoque,
        request.account.cod
      ]
    );
    response.status(201).json({ cod: result.insertId, fotoUrl: `/api/produtos/${result.insertId}/foto` });
  }));

  app.patch("/api/produtos/:cod", authenticate(pool, environment, "artesao"), upload.single("foto"), asyncRoute(async (request, response) => {
    const body = normalizeProductBody(request.body || {});
    const errors = validateProduct(body, { partial: true });
    const hasPhoto = Boolean(request.file);
    if (!Object.keys(body).length && !hasPhoto) errors.push("Informe ao menos um campo para atualizar.");
    if (request.file && !validImageSignature(request.file.buffer, request.file.mimetype)) {
      errors.push("Conteúdo da foto inválido.");
    }
    if (errors.length) return response.status(400).json({ error: "Dados inválidos.", details: errors });
    requireDatabase(pool);

    const fields = [];
    const values = [];
    for (const field of ["nome", "descricao", "preco_custo", "estoque"]) {
      if (body[field] !== undefined) {
        fields.push(`${field} = ?`);
        values.push(typeof body[field] === "string" ? body[field].trim() : body[field]);
      }
    }
    if (request.file) {
      fields.push("foto = ?");
      values.push(request.file.buffer);
    }
    values.push(request.params.cod, request.account.cod);
    const [result] = await pool.execute(
      `UPDATE Produto SET ${fields.join(", ")} WHERE cod = ? AND artesao = ?`,
      values
    );
    if (!result.affectedRows) return response.status(404).json({ error: "Produto não encontrado." });
    response.json({ message: "Produto atualizado." });
  }));

  app.delete("/api/produtos/:cod", authenticate(pool, environment, "artesao"), asyncRoute(async (request, response) => {
    requireDatabase(pool);
    const [result] = await pool.execute(
      "DELETE FROM Produto WHERE cod = ? AND artesao = ?",
      [request.params.cod, request.account.cod]
    );
    if (!result.affectedRows) return response.status(404).json({ error: "Produto não encontrado." });
    response.status(204).end();
  }));

  app.get(["/", "/index.html"], (_request, response) => {
    response.sendFile(path.join(publicDirectory, "mockup-ux.html"));
  });
  app.use(express.static(publicDirectory, { index: false }));
  app.use((request, response) => {
    if (request.path.startsWith("/api/")) return response.status(404).json({ error: "Rota não encontrada." });
    response.status(404).send("Página não encontrada.");
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError) {
      const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return response.status(status).json({ error: "Falha no upload da foto." });
    }
    if (error.message?.startsWith("A foto deve ser")) {
      return response.status(400).json({ error: error.message });
    }
    if (error.code === "ER_DUP_ENTRY") {
      return response.status(409).json({ error: "Este e-mail já está cadastrado." });
    }
    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      return response.status(409).json({ error: "Não é possível excluir: existem registros relacionados." });
    }
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return response.status(400).json({ error: "A referência informada não existe." });
    }
    if (error.type === "entity.parse.failed") {
      return response.status(400).json({ error: "JSON inválido." });
    }
    if (error.status === 503) {
      return response.status(503).json({ error: error.message });
    }
    console.error("API error:", error.message);
    response.status(500).json({ error: "Erro interno ao processar a solicitação." });
  });

  app.locals.pool = pool;
  app.locals.productImageLimit = productImageLimit;
  return app;
}

module.exports = { createApp };
