const AUTH_STORAGE_KEY = "sunnyAuth";

function getAuth() {
  try {
    return JSON.parse(sessionStorage.getItem(AUTH_STORAGE_KEY) || "null");
  } catch {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

function saveAuth(auth) {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

function clearAuth() {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem("sunnyAccountType");
}

async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const auth = getAuth();
  if (auth?.token) headers.set("Authorization", `Bearer ${auth.token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Verifique se ele está ativo.");
  }

  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();
  if (!response.ok) {
    const details = Array.isArray(payload?.details) ? ` ${payload.details.join(" ")}` : "";
    throw new Error(`${payload?.error || "A solicitação falhou."}${details}`);
  }
  return payload;
}

function requireAuth(expectedType) {
  const auth = getAuth();
  if (!auth?.token || (expectedType && auth.tipo !== expectedType)) {
    clearAuth();
    window.location.replace("login.html");
    return null;
  }
  return auth;
}

function formatPhone(account) {
  return `+${account.ddi} (${account.ddd}) ${account.telefone}`;
}

function formatAddress(account) {
  return `${account.rua}, ${account.numero}${account.complemento ? `, ${account.complemento}` : ""}`;
}

window.SunnyApi = {
  apiRequest,
  clearAuth,
  formatAddress,
  formatPhone,
  getAuth,
  requireAuth,
  saveAuth
};
