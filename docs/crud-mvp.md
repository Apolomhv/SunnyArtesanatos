# CRUD de artesãos e produtos

## Situação

A API inicial de CRUD está implementada no Express. Ela oferece cadastro e login
de clientes e artesãos, edição e exclusão da própria conta autenticada, leitura
pública de produtos e operações de produto restritas ao artesão proprietário.
O contrato completo e a configuração estão em [api.md](./api.md).

## O que já foi feito

- Conexão MySQL por pool `mysql2`, configurada por variáveis de ambiente.
- Cadastro em `Artesao` e `Cliente`; login identifica a tabela pelo tipo de conta.
- Hash de senha com bcrypt, nunca armazenamento de senha em texto.
- Autenticação Bearer com token de uma hora e verificação de conta/tipo.
- Leitura, atualização e exclusão da própria conta.
- Listagem, consulta, upload de foto, edição e exclusão de produtos.
- Consultas parametrizadas, validação de entrada e tratamento de conflito de
  unicidade e de chaves estrangeiras.
- Testes automatizados que não exigem credenciais locais do MySQL.

## O que falta antes de usar

1. Configurar `.env` com host, banco e usuário MySQL locais; gerar segredo
   `JWT_SECRET` com pelo menos 32 bytes.
2. Executar a migração de senha uma vez em bancos criados anteriormente. Novas
   instalações devem usar `database/schema.sql`.
3. Conectar as telas de cadastro/login e de produtos aos endpoints. As telas
   atuais ainda são protótipos demonstrativos.
4. Executar testes de integração com um banco de teste MySQL depois de configurar
   as credenciais.
5. Antes de disponibilizar publicamente, revisar política de senha, recuperação
   de conta, expiração/renovação do token, proteção contra abuso e regras de
   exclusão.

## Limites

Não há painel administrativo, recuperação de senha, pedidos, pagamentos,
moderação, exclusão lógica ou histórico. Exclusão de artesão com produtos e de
produto incluído em pedido é recusada pelo banco. O e-mail é único dentro de
cada tabela, mas ainda pode aparecer uma vez em `Artesao` e outra em `Cliente`.
