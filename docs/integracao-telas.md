# Guia das telas integradas

## O que mudou e por quê

1. **Cliente comum de API — `public/assets/js/api.js`**  
   Centraliza as chamadas HTTP, mensagens de erro, token da sessão e formatação
   de telefone/endereço. Assim, os formulários não repetem lógica de conexão.

2. **Cadastro — `registro.html` e `assets/js/registro.js`**  
   O formulário agora corresponde aos campos que existem no schema. Escolher
   comprador envia os dados a `POST /api/clientes`; escolher artesão envia a
   `POST /api/artesaos`. A API retorna o token e a tela abre a página inicial da
   loja. CPF, nome de usuário, complemento e outros dados não persistem porque
   não existem nas tabelas atuais.

3. **Login — `login.html` e `assets/js/login.js`**  
   A pessoa seleciona o tipo da conta e envia e-mail/senha para
   `POST /api/auth/login`. A interface guarda o token em `sessionStorage` e
   envia `Authorization: Bearer ...` às rotas protegidas. Após autenticar,
   abre a página inicial da loja.

4. **Perfil — `profile.html` e `assets/js/profile.js`**  
   Lê os dados pela rota `/me`, permite atualizar os campos existentes e
   solicitar exclusão. Para artesãos, carrega os próprios produtos e oferece
   links para editar e botões para excluir. A ação **Adicionar produto** fica
   junto ao título **Meus produtos**.

5. **Cadastro/edição de produto — `addproduto.html` e `assets/js/addproduto.js`**  
   Envia nome, descrição, preço, estoque e foto em `multipart/form-data`. O
   servidor obtém o proprietário pelo token, portanto não aceita um código de
   artesão escolhido livremente no formulário. A foto pode ser escolhida pelo
   seletor ou arrastada para a área de envio; uma prévia aparece antes de salvar.
   O mesmo formulário edita um produto existente quando recebe `?cod=...`.

6. **Catálogo e detalhe — `mockup-ux.html`, `produto.html` e seus scripts**  
   A vitrine consulta `/api/produtos`; a página de detalhes consulta
   `/api/produtos/:cod`. Preço, estoque, descrição, artesão e foto são dados
   vindos da API, não produtos de exemplo. Na página inicial, a navegação e os
   convites de compra/venda variam conforme a sessão: visitantes veem os
   convites e a sacola, clientes autenticados não veem o convite de login, e
   artesãos não veem os controles da sacola. No detalhe do produto, artesãos
   também não veem o acesso à sacola nem o convite para vender.

7. **Sacola — `public/assets/js/cart.js` e `public/assets/css/cart.css`**  
   Guarda códigos e quantidades no `localStorage`, atualiza o indicador no
   cabeçalho, permite aumentar/diminuir/remover itens e calcula o subtotal.
   Ao restaurar ou abrir a sacola, consulta a API para atualizar os dados e
   limitar quantidades ao estoque atual. A interface permite adicionar somente
   com uma sessão de cliente; visitantes e artesãos não podem adicionar itens.
   Cada conta de cliente usa uma chave de armazenamento própria. Sacolas antigas
   sem identificação de conta não são importadas, pois não é possível determinar
   com segurança a qual pessoa pertencem. O botão **Continuar** informa que
   pedidos e pagamentos ainda não estão disponíveis.

## Como experimentar

1. Inicie o MySQL Server.
2. Verifique a conexão Express/MySQL com
   `Invoke-RestMethod http://localhost:3000/api/health/database`.
3. Inicie o site com `npm run dev` e abra `http://localhost:3000`.
4. Crie uma conta de teste usando um e-mail que ainda não esteja cadastrado.
   O cadastro cria um registro real; para contas antigas, aplique a migração de
   `password_hash` conforme `docs/api.md`.
5. Cadastre um produto com estoque. As imagens desta versão têm limite de 60 KB
   por causa da coluna `BLOB`.
6. Entre com uma conta de cliente e adicione produtos à sacola. Ajuste
   quantidades e escolha **Continuar** para ver o aviso de indisponibilidade de
   pedidos e pagamentos. A sacola sobrevive à navegação e à atualização da
   página no mesmo navegador. Visitantes e artesãos não conseguem adicionar
   produtos.
7. Use um produto/conta descartável para testar exclusão.

Os testes automatizados simulam as respostas da API e não gravam dados no banco
pessoal. Eles rodam com `npm test`.

## O que continua fora

O schema e a API ainda não incluem categorias, avaliações, notificações,
checkout, pagamentos ou frete. Os dados fictícios de catálogo, perfil e detalhe
foram removidos.

O token em `sessionStorage` é adequado apenas para o protótipo local; antes de
publicar, planeje autenticação com cookie `HttpOnly; Secure; SameSite`,
recuperação de senha e revisão de segurança.
