(function () {
  const auth = SunnyApi.getAuth();
  const customerId = Number(auth?.cod);
  const storageKey = auth?.token && auth.tipo === "cliente" &&
    Number.isSafeInteger(customerId) && customerId > 0
    ? `sunnyCart:cliente:${customerId}`
    : null;
  const items = new Map();
  const dialog = document.getElementById("cart-dialog");
  const itemList = document.getElementById("cart-list");
  const countBadge = document.getElementById("cart-count");
  const cartStatus = document.getElementById("cart-status");
  const subtotalLabel = document.getElementById("cart-subtotal");
  const openButton = document.getElementById("open-cart");
  const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  function setStatus(message) {
    if (cartStatus) cartStatus.textContent = message;
  }

  function persist() {
    if (!storageKey) return false;
    try {
      localStorage.setItem(storageKey, JSON.stringify(
        [...items.values()].map(item => ({ cod: item.product.cod, quantidade: item.quantidade }))
      ));
      return true;
    } catch {
      setStatus("A sacola funciona nesta página, mas o navegador não permitiu salvá-la para a próxima visita.");
      return false;
    }
  }

  function count() {
    return [...items.values()].reduce((total, item) => total + item.quantidade, 0);
  }

  function render() {
    if (countBadge) {
      countBadge.textContent = String(count());
      openButton.setAttribute("aria-label", `Abrir sacola, ${count()} ${count() === 1 ? "item" : "itens"}`);
    }
    if (!itemList) return;

    itemList.replaceChildren();
    if (!items.size) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Sua sacola está vazia.";
      itemList.append(empty);
    } else {
      for (const [id, item] of items) {
        const row = document.createElement("article");
        row.className = "cart-item";
        const hasProductInfo = item.product.nome !== "Carregando produto…" &&
          Number.isFinite(Number(item.product.preco_custo));
        const image = document.createElement("img");
        image.className = "cart-item-image";
        if (item.product.fotoUrl) image.src = item.product.fotoUrl;
        else image.hidden = true;
        image.alt = "";

        const details = document.createElement("div");
        details.className = "cart-item-details";
        const title = document.createElement("h3");
        title.textContent = hasProductInfo ? item.product.nome : `Produto #${id}`;
        details.append(title);
        if (hasProductInfo) {
          const artisan = document.createElement("p");
          artisan.textContent = item.product.artisanName || `Artesão #${item.product.artesao}`;
          const price = document.createElement("p");
          price.textContent = `${money(item.product.preco_custo)} cada`;
          const lineTotal = document.createElement("strong");
          lineTotal.textContent = money(item.product.preco_custo * item.quantidade);
          details.append(artisan, price, lineTotal);
        } else {
          const unavailable = document.createElement("p");
          unavailable.textContent = "Não foi possível consultar os dados atuais. Tente novamente.";
          details.append(unavailable);
        }

        const controls = document.createElement("div");
        controls.className = "cart-item-controls";
        const quantity = document.createElement("span");
        quantity.textContent = String(item.quantidade);
        if (hasProductInfo) {
          const decrease = document.createElement("button");
          decrease.type = "button";
          decrease.className = "button-secondary";
          decrease.textContent = "−";
          decrease.setAttribute("aria-label", `Diminuir ${item.product.nome}`);
          decrease.addEventListener("click", () => changeQuantity(id, -1));
          const increase = document.createElement("button");
          increase.type = "button";
          increase.className = "button-secondary";
          increase.textContent = "+";
          increase.setAttribute("aria-label", `Aumentar ${item.product.nome}`);
          increase.disabled = item.quantidade >= Number(item.product.estoque);
          increase.addEventListener("click", () => changeQuantity(id, 1));
          controls.append(decrease, quantity, increase);
        } else {
          controls.append(quantity);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "cart-remove";
        remove.textContent = "Remover";
        remove.addEventListener("click", () => removeItem(id));
        controls.append(remove);
        row.append(image, details, controls);
        itemList.append(row);
      }
    }

    const hasUnknownPrice = [...items.values()].some(item =>
      !Number.isFinite(Number(item.product.preco_custo))
    );
    const subtotal = [...items.values()].reduce((total, item) => {
      return total + Number(item.product.preco_custo) * item.quantidade;
    }, 0);
    subtotalLabel.textContent = hasUnknownPrice ? "—" : money(subtotal);
  }

  function notifyChange() {
    render();
    window.dispatchEvent(new CustomEvent("sunnycartchange", { detail: { count: count() } }));
  }

  function add(product, quantity = 1) {
    const auth = SunnyApi.getAuth();
    if (!auth?.token) {
      setStatus("Entre em uma conta de cliente para adicionar produtos à sacola.");
      return false;
    }
    if (auth.tipo !== "cliente") {
      setStatus("A sacola é exclusiva para contas de cliente.");
      return false;
    }
    if (!storageKey) {
      setStatus("Não foi possível identificar a conta de cliente desta sessão.");
      return false;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || Number(product.estoque) < 1) {
      setStatus("Este produto não tem unidades disponíveis para adicionar.");
      return false;
    }

    const id = Number(product.cod);
    const currentQuantity = items.get(id)?.quantidade || 0;
    if (currentQuantity + quantity > Number(product.estoque)) {
      setStatus(`Há somente ${product.estoque} unidade(s) disponível(is) de ${product.nome}.`);
      return false;
    }

    items.set(id, { product, quantidade: currentQuantity + quantity });
    const saved = persist();
    notifyChange();
    setStatus(saved ? `${product.nome} adicionado à sacola.` : `${product.nome} adicionado, mas não será mantido ao sair desta página.`);
    return true;
  }

  function changeQuantity(id, delta) {
    const item = items.get(Number(id));
    if (!item) return;
    const next = item.quantidade + delta;
    if (next < 1) {
      removeItem(id);
      return;
    }
    if (next > Number(item.product.estoque)) {
      setStatus(`Há somente ${item.product.estoque} unidade(s) disponível(is) de ${item.product.nome}.`);
      return;
    }
    item.quantidade = next;
    persist();
    notifyChange();
    setStatus(`Quantidade de ${item.product.nome} atualizada.`);
  }

  function removeItem(id) {
    const item = items.get(Number(id));
    if (!item) return;
    items.delete(Number(id));
    persist();
    notifyChange();
    setStatus(`${item.product.nome} removido da sacola.`);
  }

  async function refresh() {
    const currentItems = [...items.entries()];
    const results = await Promise.all(currentItems.map(async ([id]) => {
      try {
        return { id, product: await SunnyApi.apiRequest(`/api/produtos/${encodeURIComponent(id)}`) };
      } catch (error) {
        if (error.message.includes("Produto não encontrado")) return { id, missing: true };
        throw error;
      }
    }));

    let changed = false;
    for (const result of results) {
      const item = items.get(result.id);
      if (!item) continue;
      if (result.missing || Number(result.product.estoque) < 1) {
        items.delete(result.id);
        changed = true;
        continue;
      }
      item.product = result.product;
      if (item.quantidade > Number(result.product.estoque)) {
        item.quantidade = Number(result.product.estoque);
        changed = true;
      }
    }
    if (changed) {
      persist();
      notifyChange();
      setStatus("A sacola foi atualizada conforme os produtos e estoques atuais.");
    } else {
      render();
    }
  }

  async function restore() {
    if (!storageKey) {
      render();
      return;
    }

    let savedItems;
    try {
      savedItems = JSON.parse(localStorage.getItem(storageKey) || "[]");
    } catch {
      localStorage.removeItem(storageKey);
      setStatus("A sacola salva estava inválida e foi limpa.");
      return;
    }

    if (!Array.isArray(savedItems)) {
      localStorage.removeItem(storageKey);
      setStatus("A sacola salva estava inválida e foi limpa.");
      return;
    }

    for (const saved of savedItems) {
      if (!Number.isSafeInteger(Number(saved.cod)) || Number(saved.cod) < 1 ||
          !Number.isSafeInteger(Number(saved.quantidade)) || Number(saved.quantidade) < 1) {
        continue;
      }
      items.set(Number(saved.cod), {
        product: { cod: Number(saved.cod), nome: "Carregando produto…", estoque: Number.MAX_SAFE_INTEGER },
        quantidade: Number(saved.quantidade)
      });
    }
    if (!items.size) {
      render();
      return;
    }
    try {
      await refresh();
    } catch (error) {
      render();
      setStatus(`Não foi possível recuperar a sacola: ${error.message}`);
    }
  }

  if (openButton) {
    openButton.addEventListener("click", async () => {
      setStatus("Conferindo preços e estoque atuais…");
      try {
        await refresh();
        dialog.showModal();
      } catch (error) {
        setStatus(`Não foi possível abrir a sacola: ${error.message}`);
        dialog.showModal();
      }
    });
    document.getElementById("close-cart").addEventListener("click", () => dialog.close());
    document.getElementById("clear-cart").addEventListener("click", () => {
      items.clear();
      persist();
      notifyChange();
      setStatus("Sacola esvaziada.");
    });
    document.getElementById("checkout").addEventListener("click", () => {
      document.getElementById("checkout-note").hidden = false;
    });
  }

  window.addEventListener("storage", event => {
    if (storageKey && event.key === storageKey) window.location.reload();
  });

  window.SunnyCart = { add, count, restore };
  render();
})();
