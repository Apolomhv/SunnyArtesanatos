require("dotenv").config();

const { createApp } = require("./src/app");

const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("A variável PORT deve ser um número entre 1 e 65535.");
}

const app = createApp();
const server = app.listen(port, () => {
  console.log(`SunnyArtesanatos disponível em http://localhost:${port}`);
  if (!app.locals.pool) {
    console.warn("Banco MySQL não configurado. Rotas de persistência responderão com 503.");
  }
});

async function shutdown() {
  server.close(async () => {
    if (app.locals.pool) await app.locals.pool.end();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
