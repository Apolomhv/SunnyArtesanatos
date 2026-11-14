USE sunny_artesanatos;

ALTER TABLE Artesao
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email;

ALTER TABLE Cliente
  ADD COLUMN password_hash VARCHAR(255) NULL AFTER email;
