const statusMessage = document.getElementById("productStatus");
const productDetail = document.getElementById("productDetail");
const productCode = new URLSearchParams(window.location.search).get("cod");
const auth = SunnyApi.getAuth();
let currentProduct;

if (auth?.token) {
  document.getElementById("loginLink").hidden = true;
  document.getElementById("profileLink").hidden = false;
}
if (auth?.token && auth.tipo === "artesao") {
  document.getElementById("open-cart").hidden = true;
}

async function loadProduct() {
  if (!productCode || !/^\d+$/.test(productCode)) {
    statusMessage.textContent = "Código de produto inválido. Volte ao catálogo e escolha um produto.";
    return;
  }

  try {
    const product = await SunnyApi.apiRequest(`/api/produtos/${encodeURIComponent(productCode)}`);
    currentProduct = product;
    document.title = `${product.nome} — SunnyArtesanatos`;
    document.getElementById("breadcrumbName").textContent = product.nome;
    document.getElementById("productName").textContent = product.nome;
    document.getElementById("artisanName").textContent = product.artisanName || `Artesão #${product.artesao}`;
    document.getElementById("productPrice").textContent = Number(product.preco_custo).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
    document.getElementById("productDescription").textContent = product.descricao;
    document.getElementById("productStock").textContent =
      `${product.estoque} ${Number(product.estoque) === 1 ? "unidade disponível" : "unidades disponíveis"}`;
    const quantity = document.getElementById("productQuantity");
    quantity.max = String(product.estoque);
    const addButton = document.getElementById("addProductToCart");
    const isInStock = Number(product.estoque) > 0;
    const canShop = Boolean(auth?.token && auth.tipo === "cliente");
    addButton.disabled = !isInStock || !canShop;
    const availabilityNotice = document.getElementById("cartAvailabilityNotice");
    if (!auth?.token) {
      availabilityNotice.textContent = "Entre em uma conta de cliente para adicionar produtos à sacola.";
    } else if (!canShop) {
      availabilityNotice.textContent = "A sacola é exclusiva para contas de cliente.";
    } else {
      availabilityNotice.textContent = "Frete, pedidos e pagamentos ainda não estão disponíveis.";
    }
    const image = document.getElementById("productImage");
    image.src = product.fotoUrl;
    image.alt = `Foto de ${product.nome}`;

    if (auth?.tipo === "artesao" && Number(auth.cod) === Number(product.artesao)) {
      const editLink = document.getElementById("editProduct");
      editLink.href = `addproduto.html?cod=${encodeURIComponent(product.cod)}`;
      editLink.hidden = false;
    }

    statusMessage.textContent = isInStock ? "" : "Produto sem estoque.";
    productDetail.hidden = false;
  } catch (error) {
    statusMessage.textContent = error.message;
  }
}

document.getElementById("addProductToCart").addEventListener("click", () => {
  if (!currentProduct) return;
  const quantityInput = document.getElementById("productQuantity");
  const quantity = Number(quantityInput.value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > Number(currentProduct.estoque)) {
    quantityInput.setCustomValidity(`Informe uma quantidade entre 1 e ${currentProduct.estoque}.`);
    quantityInput.reportValidity();
    return;
  }
  quantityInput.setCustomValidity("");
  const added = SunnyCart.add(currentProduct, quantity);
  if (!added) {
    const auth = SunnyApi.getAuth();
    statusMessage.textContent = !auth?.token
      ? "Entre em uma conta de cliente para adicionar produtos à sacola."
      : auth.tipo !== "cliente"
        ? "A sacola é exclusiva para contas de cliente."
        : "Não foi possível adicionar este produto à sacola.";
  }
});

loadProduct();
SunnyCart.restore();
