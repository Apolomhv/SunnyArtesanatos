# API de contas e produtos

## Configuração

1. Para um banco novo, execute `database/schema.sql` no MySQL Workbench. Para
   um banco existente, aplique `001_add_password_hash.sql` se ele ainda não
   tiver `password_hash`.
2. Copie `.env.example` para `.env` e preencha as credenciais do MySQL.
3. Configure `JWT_SECRET` com um segredo aleatório de pelo menos 32 caracteres.
4. Execute `npm install` e `npm run dev`.

O arquivo `.env` contém segredos e não deve ser enviado ao Git. O servidor pode
iniciar sem configuração do banco para servir as páginas, mas as rotas que usam
o banco retornam `503` até ele ser configurado.

## Autenticação

Cadastro:

- `POST /api/artesaos`
- `POST /api/clientes`

O corpo JSON contém os campos da tabela e `senha`:

```json
{
  "nome": "Ana Artesã",
  "ddi": "55",
  "ddd": "11",
  "telefone": "999991234",
  "email": "ana@example.com",
  "senha": "uma-senha-com-pelo-menos-8-caracteres",
  "cep": "01001000",
  "rua": "Rua de Exemplo",
  "numero": 10,
  "bairro": "Centro",
  "cidade": "São Paulo",
  "uf": "SP"
}
```

O cadastro retorna `201` com `cod`, `tipo` e um token Bearer. A senha enviada
não é salva em texto: o servidor calcula um hash com bcrypt e grava somente
`password_hash`.

Login:

- `POST /api/auth/login`
- Corpo: `{"tipo":"artesao","email":"ana@example.com","senha":"..."}` ou
  `tipo` igual a `cliente`.

Para rotas protegidas, envie
`Authorization: Bearer <token>`. O token tem validade de uma hora.

## Rotas de conta

| Método | Rota | Acesso | Operação |
|---|---|---|---|
| `GET` | `/api/artesaos/me` | Artesão autenticado | Consultar os próprios dados |
| `PATCH` | `/api/artesaos/me` | Artesão autenticado | Editar os próprios dados |
| `DELETE` | `/api/artesaos/me` | Artesão autenticado | Excluir a própria conta se não tiver produtos |
| `GET` | `/api/clientes/me` | Cliente autenticado | Consultar os próprios dados |
| `PATCH` | `/api/clientes/me` | Cliente autenticado | Editar os próprios dados |
| `DELETE` | `/api/clientes/me` | Cliente autenticado | Excluir a própria conta |
| `GET` | `/api/artesaos/me/produtos` | Artesão autenticado | Listar os próprios produtos |

O token limita essas rotas ao tipo e ao código da própria conta. Não há painel
administrativo nem redefinição de senha nesta etapa.

## Rotas de produtos

| Método | Rota | Acesso | Operação |
|---|---|---|---|
| `GET` | `/api/produtos` | Público | Listar produtos |
| `GET` | `/api/produtos/:cod` | Público | Consultar um produto |
| `GET` | `/api/produtos/:cod/foto` | Público | Obter imagem binária |
| `POST` | `/api/produtos` | Artesão autenticado | Cadastrar produto |
| `PATCH` | `/api/produtos/:cod` | Artesão proprietário | Editar produto |
| `DELETE` | `/api/produtos/:cod` | Artesão proprietário | Excluir produto próprio |

Criar produto usa `multipart/form-data`: campos `nome`, `descricao`,
`preco_custo`, `estoque` e arquivo `foto`. O artesão é identificado pelo token,
não por um código enviado pelo cliente. A imagem deve ser JPEG, PNG, GIF ou
WebP, com até 60 KB. Esse limite é necessário porque a coluna atual `foto BLOB`
do MySQL comporta no máximo 65.535 bytes. Aumentar o limite requer alterar a
coluna para `MEDIUMBLOB` e criar uma migração, o que não foi feito para preservar
o schema solicitado.

O campo `foto` não é incluído no JSON de listagem; cada produto inclui `fotoUrl`.
O conteúdo binário é servido pela rota de foto.

Não há rotas para checkout, criação/consulta de pedidos ou pagamentos nesta
versão. A sacola funciona localmente como uma lista de produtos e não confirma
compras nem reserva estoque.

## Erros comuns

- `400`: entrada inválida ou campos obrigatórios ausentes.
- `401`: credenciais ausentes/incorretas ou token inválido/expirado.
- `403`: tipo de conta sem permissão para a operação.
- `404`: conta ou produto inexistente.
- `409`: e-mail já cadastrado.
- `413`: imagem maior que o limite.
- `503`: banco não configurado ou indisponível.

Para esse MVP, o e-mail único é aplicado separadamente em `Artesao` e `Cliente`;
um mesmo endereço pode existir nas duas tabelas. O login recebe `tipo` para
identificar qual tabela consultar.

## Telas integradas e limites restantes

Cadastro, login, perfil, catálogo, detalhe e operações de produtos chamam a API.
Os tokens ficam em `sessionStorage` nesta versão de
desenvolvimento; antes de produção, recomenda-se migrar para cookie
`HttpOnly; Secure; SameSite` e revisar a autenticação.

O catálogo ainda não tem categorias, múltiplas fotos ou frete. A sacola local é
isolada por cliente e serve apenas para organizar itens; não há checkout nem
processamento de pagamentos.
