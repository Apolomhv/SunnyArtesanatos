# SunnyArtesanatos

Protótipo de marketplace de artesanato servido por Node.js e Express.

## Requisitos

- Node.js 20 ou superior
- npm

## Executar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para executar sem reinício automático, use `npm start`.

O endpoint `GET /api/health` confirma que o servidor está ativo.

## Banco de dados MySQL

O schema inicial está em `database/schema.sql` e cria as tabelas de contas,
produtos e pedidos no banco `sunny_artesanatos`. No MySQL Workbench, abra o
arquivo e execute o script.

As chaves estrangeiras exigem um cliente por pedido, um artesão por produto e
um produto e pedido por linha de `Pedido_Produto`. O relacionamento permite
várias linhas por pedido ou produto, mas MySQL não consegue exigir que cada
pedido tenha ao menos uma linha usando apenas chaves estrangeiras. A aplicação
deverá criar pedido e itens na mesma transação e não confirmar pedido vazio.

O script usa `CREATE TABLE IF NOT EXISTS` e não apaga tabelas ou dados. Se a
versão anterior do schema já foi executada, suas tabelas antigas continuarão no
banco. Faça backup e use um banco vazio ou uma migração planejada antes de
remover qualquer tabela antiga.

O schema não cria usuários nem senhas de conexão e não insere dados pessoais.

Para configurar a API, copie `.env.example` para `.env`, preencha os dados do
MySQL e gere um segredo JWT forte. Não compartilhe nem versiona o `.env`.
`database/schema.sql` representa instalações novas. Em um banco antigo, aplique
`database/migrations/001_add_password_hash.sql` se ele ainda não tiver
`password_hash`.

A API fornece cadastro/login de artesãos e clientes, edição e exclusão da
própria conta autenticada e operações de produtos. Consulte
[docs/api.md](./docs/api.md) para as rotas disponíveis.
O passo a passo das telas está em [docs/integracao-telas.md](./docs/integracao-telas.md).
O checkout e os pagamentos não estão disponíveis nesta versão.

Para o escopo de CRUD sem alterar o schema, consulte
[docs/crud-mvp.md](./docs/crud-mvp.md). O documento lista as rotas, validações,
upload de imagens, dependências de exclusão e limites do escopo.

## Testes automatizados

```bash
npm test
```

O Playwright inicia o servidor de teste automaticamente. Na primeira execução,
se o navegador ainda não estiver instalado, rode `npx playwright install chromium`.
Os testes verificam catálogo, sacola e estoque, cadastro demonstrativo, API de
saúde e isolamento dos arquivos privados.

## Estrutura

- `server.js`: configuração do Express, endpoint de saúde e servidor web.
- `src/`: conexão MySQL, autenticação e rotas da API.
- `public/`: páginas, estilos, scripts e imagens disponíveis ao navegador.
- `tests/`: testes end-to-end automatizados.
- `unit-tests/`: testes automatizados das rotas sem depender de um MySQL local.
- `playwright.config.js`: configuração de navegador e servidor de teste.
- `database/schema.sql`: schema MySQL de contas, produtos e pedidos.
- `database/migrations/`: alterações incrementais para bancos existentes.
- `docs/integracao-telas.md`: explicação passo a passo das telas ligadas à API.
- `PRD.md`: requisitos do produto.

As telas integradas dependem da configuração de MySQL e JWT descrita em
[docs/api.md](./docs/api.md).
