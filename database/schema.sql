CREATE DATABASE IF NOT EXISTS sunny_artesanatos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE sunny_artesanatos;

CREATE TABLE IF NOT EXISTS Artesao (
  cod INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(45) NOT NULL,
  ddi VARCHAR(2) NOT NULL,
  ddd VARCHAR(2) NOT NULL,
  telefone VARCHAR(10) NOT NULL,
  email VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  rua VARCHAR(40) NOT NULL,
  numero INT NOT NULL,
  bairro VARCHAR(25) NOT NULL,
  cidade VARCHAR(35) NOT NULL,
  uf CHAR(2) NOT NULL,
  PRIMARY KEY (cod),
  UNIQUE KEY uq_artesao_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Cliente (
  cod INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(45) NOT NULL,
  ddi VARCHAR(2) NOT NULL,
  ddd VARCHAR(2) NOT NULL,
  telefone VARCHAR(10) NOT NULL,
  email VARCHAR(60) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  cep VARCHAR(8) NOT NULL,
  rua VARCHAR(40) NOT NULL,
  numero INT NOT NULL,
  bairro VARCHAR(25) NOT NULL,
  cidade VARCHAR(35) NOT NULL,
  uf CHAR(2) NOT NULL,
  PRIMARY KEY (cod),
  UNIQUE KEY uq_cliente_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Produto (
  cod INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome VARCHAR(75) NOT NULL,
  descricao VARCHAR(700) NOT NULL,
  preco_custo DECIMAL(10, 2) NOT NULL,
  foto BLOB NOT NULL,
  estoque INT NOT NULL DEFAULT 0,
  artesao INT UNSIGNED NOT NULL,
  PRIMARY KEY (cod),
  KEY idx_produto_artesao (artesao),
  CONSTRAINT chk_produto_preco_custo CHECK (preco_custo >= 0),
  CONSTRAINT chk_produto_estoque CHECK (estoque >= 0),
  CONSTRAINT fk_produto_artesao
    FOREIGN KEY (artesao) REFERENCES Artesao (cod)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Pedido (
  cod INT UNSIGNED NOT NULL AUTO_INCREMENT,
  data DATE NOT NULL,
  tipo_pag VARCHAR(18) NOT NULL,
  cliente INT UNSIGNED NOT NULL,
  PRIMARY KEY (cod),
  KEY idx_pedido_cliente_data (cliente, data),
  CONSTRAINT fk_pedido_cliente
    FOREIGN KEY (cliente) REFERENCES Cliente (cod)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS Pedido_Produto (
  cod INT UNSIGNED NOT NULL AUTO_INCREMENT,
  quantidade INT NOT NULL,
  preco_venda DECIMAL(10, 2) NOT NULL,
  avaliacao VARCHAR(200) NULL,
  produto INT UNSIGNED NOT NULL,
  pedido INT UNSIGNED NOT NULL,
  PRIMARY KEY (cod),
  KEY idx_pedido_produto_produto (produto),
  KEY idx_pedido_produto_pedido (pedido),
  CONSTRAINT chk_pedido_produto_quantidade CHECK (quantidade > 0),
  CONSTRAINT chk_pedido_produto_preco CHECK (preco_venda >= 0),
  CONSTRAINT fk_pedido_produto_produto
    FOREIGN KEY (produto) REFERENCES Produto (cod)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT fk_pedido_produto_pedido
    FOREIGN KEY (pedido) REFERENCES Pedido (cod)
    ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB;
