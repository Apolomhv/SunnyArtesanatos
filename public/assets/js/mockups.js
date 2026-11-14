let products = [];
const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const search = document.querySelector("#search");
const sort = document.querySelector("#sort");
const catalog = document.querySelector("#products");
const status = document.querySelector("#status");
const resultCount = document.querySelector("#result-count");
const cartAvailabilityNotice = document.getElementById("cartAvailabilityNotice");
const auth = SunnyApi.getAuth();
const canShop = Boolean(auth?.token && auth.tipo === "cliente");
const isArtisan = Boolean(auth?.token && auth.tipo === "artesao");

search.value = new URLSearchParams(window.location.search).get("q") || "";

if (auth?.token && auth.tipo === "cliente") {
  document.getElementById("shoppingLoginLink").hidden = true;
}
if (isArtisan) {
  document.getElementById("sellerRegistrationLink").hidden = true;
  document.getElementById("open-cart").hidden = true;
}

if (!auth?.token) {
  cartAvailabilityNotice.textContent = "Entre em uma conta de cliente para adicionar produtos à sacola.";
} else if (!canShop) {
  cartAvailabilityNotice.textContent = "A sacola é exclusiva para contas de cliente.";
} else {
  cartAvailabilityNotice.textContent = "Frete, pedidos e pagamentos ainda não estão disponíveis.";
}

function renderProducts() {
  const query = search.value.trim().toLocaleLowerCase("pt-BR");
  const found = products.filter(product =>
    `${product.nome} ${product.artisanName || ""}`.toLocaleLowerCase("pt-BR").includes(query)
  );
  if (sort.value === "price-asc") found.sort((a, b) => Number(a.preco_custo) - Number(b.preco_custo));
  if (sort.value === "price-desc") found.sort((a, b) => Number(b.preco_custo) - Number(a.preco_custo));

  resultCount.textContent = `${found.length} ${found.length === 1 ? "produto encontrado" : "produtos encontrados"}`;
  catalog.replaceChildren();
  if (!found.length) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "Nenhum produto encontrado.";
    catalog.append(empty);
    return;
  }

  for (const product of found) {
    const card = document.createElement("article");
    card.className = "product-card";
    const link = document.createElement("a");
    link.className = "product-card-link";
    link.href = `produto.html?cod=${encodeURIComponent(product.cod)}`;
    link.setAttribute("aria-label", `Ver ${product.nome}`);
    const image = document.createElement("img");
    image.className = "product-art";
    image.src = product.fotoUrl;
    image.alt = `Foto de ${product.nome}`;
    link.append(image);

    const info = document.createElement("div");
    info.className = "product-info";
    const title = document.createElement("h3");
    title.textContent = product.nome;
    const artisan = document.createElement("p");
    artisan.textContent = `Por ${product.artisanName || `Artesão #${product.artesao}`}`;
    const price = document.createElement("p");
    price.className = "price";
    price.textContent = money(product.preco_custo);
    const stock = document.createElement("p");
    stock.textContent = `${product.estoque} ${Number(product.estoque) === 1 ? "unidade disponível" : "unidades disponíveis"}`;
    const details = document.createElement("a");
    details.className = "button button-secondary product-details-link";
    details.href = link.href;
    details.textContent = "Ver produto";
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.dataset.add = String(product.cod);
    addButton.textContent = "Adicionar à sacola";
    addButton.hidden = isArtisan;
    addButton.disabled = Number(product.estoque) < 1 || !canShop;
    info.append(title, artisan, price, stock, details, addButton);
    card.append(link, info);
    catalog.append(card);
  }
}

async function loadProducts() {
  catalog.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "empty";
  loading.textContent = "Carregando produtos…";
  catalog.append(loading);
  try {
    products = await SunnyApi.apiRequest("/api/produtos");
    await SunnyCart.restore();
    renderProducts();
  } catch (error) {
    resultCount.textContent = "Catálogo indisponível";
    status.textContent = error.message;
    catalog.replaceChildren();
    const failure = document.createElement("p");
    failure.className = "empty";
    failure.textContent = error.message;
    catalog.append(failure);
  }
}

if (auth?.token) {
  document.querySelector(".header-tools .account-link").hidden = true;
  document.getElementById("profileLink").hidden = false;
}

search.addEventListener("input", renderProducts);
sort.addEventListener("change", renderProducts);
catalog.addEventListener("click", event => {
  const button = event.target.closest("[data-add]");
  if (!button) return;
  const product = products.find(item => Number(item.cod) === Number(button.dataset.add));
  if (!product) return;
  SunnyCart.add(product);
});
window.addEventListener("sunnycartchange", renderProducts);
document.querySelector(".market-search").addEventListener("submit", event => {
  event.preventDefault();
  document.querySelector("#catalogo").scrollIntoView({ behavior: "smooth" });
  renderProducts();
});

loadProducts();
