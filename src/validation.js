const accountFields = {
  nome: { max: 45 },
  ddi: { max: 2, pattern: /^\d+$/ },
  ddd: { max: 2, pattern: /^\d+$/ },
  telefone: { max: 10, pattern: /^\d+$/ },
  email: { max: 60, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  cep: { max: 8, pattern: /^\d{8}$/ },
  rua: { max: 40 },
  numero: { integer: true, min: 0 },
  bairro: { max: 25 },
  cidade: { max: 35 },
  uf: { exact: 2, pattern: /^[A-Za-z]{2}$/ }
};

function validateAccount(body = {}, { partial = false, includePassword = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["O corpo da solicitação deve ser um objeto JSON."];
  }
  const errors = [];
  const allowedFields = new Set(Object.keys(accountFields));
  if (includePassword) allowedFields.add("senha");

  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) {
      errors.push(`Campo não permitido: ${field}.`);
    }
  }

  for (const [field, rules] of Object.entries(accountFields)) {
    const value = body[field];
    if (value === undefined) {
      if (!partial) errors.push(`Campo obrigatório: ${field}.`);
      continue;
    }

    if (rules.integer) {
      if (!Number.isInteger(value) || value < rules.min || value > 2147483647) {
        errors.push(`${field} deve ser um número inteiro válido.`);
      }
      continue;
    }

    if (typeof value !== "string" || value.trim().length === 0) {
      errors.push(`${field} deve ser um texto não vazio.`);
      continue;
    }

    if (value.length > rules.max) {
      errors.push(`${field} deve ter no máximo ${rules.max} caracteres.`);
    }
    if (rules.exact && value.length !== rules.exact) {
      errors.push(`${field} deve ter exatamente ${rules.exact} caracteres.`);
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} tem formato inválido.`);
    }
  }

  if (includePassword && !partial && body.senha === undefined) {
    errors.push("Campo obrigatório: senha.");
  }
  if (body.senha !== undefined) {
    if (typeof body.senha !== "string" || body.senha.length < 8) {
      errors.push("senha deve conter ao menos 8 caracteres.");
    } else if (Buffer.byteLength(body.senha, "utf8") > 72) {
      errors.push("senha não pode exceder 72 bytes.");
    }
  }

  return errors;
}

function validateProduct(body = {}, { partial = false } = {}) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return ["O corpo da solicitação deve conter campos de produto."];
  }
  const fields = ["nome", "descricao", "preco_custo", "estoque"];
  const errors = [];
  const allowedFields = new Set(fields);

  for (const field of Object.keys(body)) {
    if (!allowedFields.has(field)) errors.push(`Campo não permitido: ${field}.`);
  }

  for (const field of fields) {
    const value = body[field];
    if (value === undefined) {
      if (!partial) errors.push(`Campo obrigatório: ${field}.`);
      continue;
    }

    if (field === "nome" || field === "descricao") {
      const max = field === "nome" ? 75 : 700;
      if (typeof value !== "string" || value.trim().length === 0 || value.length > max) {
        errors.push(`${field} deve ser texto não vazio com até ${max} caracteres.`);
      }
    } else if (field === "estoque") {
      if (!Number.isInteger(value) || value < 0 || value > 2147483647) {
        errors.push("estoque deve ser inteiro entre 0 e 2147483647.");
      }
    } else if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 99999999.99) {
      errors.push("preco_custo deve ser um valor não negativo válido.");
    }
  }

  return errors;
}

function normalizeProductBody(body = {}) {
  const normalized = { ...body };
  if (typeof normalized.preco_custo === "string" && normalized.preco_custo.trim() !== "") {
    normalized.preco_custo = Number(normalized.preco_custo);
  }
  if (typeof normalized.estoque === "string" && /^\d+$/.test(normalized.estoque)) {
    normalized.estoque = Number(normalized.estoque);
  }
  return normalized;
}

module.exports = { normalizeProductBody, validateAccount, validateProduct };
