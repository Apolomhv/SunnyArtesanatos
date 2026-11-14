const auth = SunnyApi.requireAuth();
const profileStatus = document.getElementById("profileStatus");
const profileNotice = document.getElementById("profileNotice");
const tabs = [...document.querySelectorAll(".profile-tab")];
const panels = [...document.querySelectorAll(".profile-panel")];
const profileForm = document.getElementById("profileForm");
document.getElementById("editProfile").disabled = true;
document.getElementById("deleteAccount").disabled = true;
let account;

if (auth) {
  const isArtisan = auth.tipo === "artesao";
  const accountRoute = isArtisan ? "/api/artesaos/me" : "/api/clientes/me";

  function showError(error) {
    profileStatus.textContent = error.message;
    if (/token|autenticação|conta não encontrada/i.test(error.message)) {
      SunnyApi.clearAuth();
      window.location.replace("login.html");
    }
  }

  function showAccount(data) {
    account = data;
    document.getElementById("profileName").textContent = data.nome;
    document.getElementById("profileRole").textContent = isArtisan ? "Conta de artesão" : "Conta de comprador";
    document.getElementById("accountBadge").textContent = isArtisan ? "Artesão" : "Comprador";
    document.querySelector(".avatar").textContent = data.nome.trim().charAt(0).toUpperCase();
    document.getElementById("editProfile").disabled = false;
    document.getElementById("deleteAccount").disabled = false;

    document.querySelector('[data-account="nome"]').textContent = data.nome;
    document.querySelector('[data-account="email"]').textContent = data.email;
    document.querySelector('[data-account="telefone"]').textContent = SunnyApi.formatPhone(data);
    document.querySelector('[data-account="rua"]').textContent = SunnyApi.formatAddress(data);
    document.querySelector('[data-account="cidade"]').textContent = `${data.bairro} · ${data.cidade}`;
    document.querySelector('[data-account="cep"]').textContent = `${data.cep} · ${data.uf}`;

    for (const field of ["nome", "email", "ddi", "ddd", "telefone", "cep", "rua", "numero", "bairro", "cidade", "uf"]) {
      profileForm.elements[field].value = data[field];
    }
    document.getElementById("activityTabLabel").textContent = isArtisan ? "Meus produtos" : "Minhas compras";
    document.getElementById("activityHeading").textContent = isArtisan ? "Meus produtos" : "Minhas compras";
    document.getElementById("activityDescription").textContent = isArtisan
      ? "Produtos que você cadastrou."
      : "O acompanhamento de pedidos ainda não está disponível.";
    document.getElementById("addProductAction").hidden = !isArtisan;
    if (!isArtisan) {
      document.getElementById("activityList").innerHTML =
        '<p class="empty-state">Pedidos e compras ainda não estão disponíveis nesta versão.</p>';
    }
    document.getElementById("activityAction").hidden = isArtisan;
    document.getElementById("notificationsDescription").textContent =
      "As notificações ainda não estão conectadas à API.";
    document.getElementById("markAllRead").hidden = true;
    document.getElementById("notificationCount").textContent = "0";
    document.getElementById("notificationsList").innerHTML =
      '<p class="empty-state">Nenhuma notificação disponível no momento.</p>';
    profileNotice.textContent = "Dados carregados da conta conectada.";
  }

  async function loadProducts() {
    const list = document.getElementById("activityList");
    list.replaceChildren();
    try {
      const products = await SunnyApi.apiRequest("/api/artesaos/me/produtos");
      if (!products.length) {
        list.innerHTML = '<p class="empty-state">Você ainda não cadastrou produtos.</p>';
        return;
      }

      for (const product of products) {
        const card = document.createElement("article");
        card.className = "activity-card";
        const image = document.createElement("img");
        image.className = "activity-product-image";
        image.src = product.fotoUrl;
        image.alt = "";
        const copy = document.createElement("div");
        copy.className = "activity-copy";
        const title = document.createElement("h3");
        title.textContent = product.nome;
        const details = document.createElement("p");
        details.textContent = `${formatMoney(product.preco_custo)} · Estoque: ${product.estoque}`;
        const actions = document.createElement("div");
        actions.className = "activity-actions";
        const edit = document.createElement("a");
        edit.className = "button button-secondary";
        edit.href = `addproduto.html?cod=${encodeURIComponent(product.cod)}`;
        edit.textContent = "Editar";
        const remove = document.createElement("button");
        remove.className = "button button-secondary";
        remove.type = "button";
        remove.textContent = "Excluir";
        remove.addEventListener("click", async () => {
          if (!window.confirm(`Excluir o produto “${product.nome}”?`)) return;
          remove.disabled = true;
          try {
            await SunnyApi.apiRequest(`/api/produtos/${product.cod}`, { method: "DELETE" });
            await loadProducts();
            profileStatus.textContent = "Produto excluído.";
          } catch (error) {
            showError(error);
            remove.disabled = false;
          }
        });

        copy.append(title, details);
        actions.append(edit, remove);
        card.append(image, copy, actions);
        list.append(card);
      }
    } catch (error) {
      showError(error);
    }
  }

  function formatMoney(value) {
    return Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function selectTab(tab) {
    tabs.forEach(item => {
      const selected = item === tab;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(panel => {
      panel.hidden = panel.id !== tab.getAttribute("aria-controls");
    });
    if (isArtisan && tab.dataset.tab === "activity") loadProducts();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectTab(tab));
    tab.addEventListener("keydown", event => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const direction = event.key === "ArrowRight" ? 1 : -1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      selectTab(next);
      next.focus();
    });
  });

  document.getElementById("editProfile").addEventListener("click", () => {
    profileForm.hidden = false;
    document.getElementById("personalDetails").hidden = true;
    document.getElementById("editProfile").hidden = true;
    profileForm.elements.nome.focus();
  });

  document.getElementById("cancelEdit").addEventListener("click", () => {
    if (account) showAccount(account);
    profileForm.hidden = true;
    document.getElementById("personalDetails").hidden = false;
    document.getElementById("editProfile").hidden = false;
    profileStatus.textContent = "";
  });

  profileForm.addEventListener("submit", async event => {
    event.preventDefault();
    profileStatus.textContent = "";
    const formData = new FormData(profileForm);
    const body = Object.fromEntries(formData.entries());
    body.numero = Number(body.numero);
    body.ddi = body.ddi.replace(/\D/g, "");
    body.ddd = body.ddd.replace(/\D/g, "");
    body.telefone = body.telefone.replace(/\D/g, "");
    body.cep = body.cep.replace(/\D/g, "");
    body.uf = body.uf.toUpperCase();
    if (!body.senha) delete body.senha;

    const saveButton = document.getElementById("saveProfile");
    saveButton.disabled = true;
    try {
      await SunnyApi.apiRequest(accountRoute, { method: "PATCH", body: JSON.stringify(body) });
      const accountFields = { ...body };
      delete accountFields.senha;
      account = { ...account, ...accountFields };
      showAccount(account);
      profileForm.hidden = true;
      document.getElementById("personalDetails").hidden = false;
      document.getElementById("editProfile").hidden = false;
      profileStatus.textContent = "Dados da conta atualizados.";
    } catch (error) {
      showError(error);
    } finally {
      saveButton.disabled = false;
    }
  });

  document.getElementById("deleteAccount").addEventListener("click", async () => {
    if (!window.confirm("Excluir sua conta? Esta ação não pode ser desfeita.")) return;
    try {
      await SunnyApi.apiRequest(accountRoute, { method: "DELETE" });
      SunnyApi.clearAuth();
      window.location.assign("login.html");
    } catch (error) {
      showError(error);
    }
  });

  document.getElementById("logoutButton").addEventListener("click", () => {
    SunnyApi.clearAuth();
    window.location.assign("login.html");
  });

  SunnyApi.apiRequest(accountRoute)
    .then(data => {
      showAccount(data);
      tabs[0].tabIndex = 0;
      tabs.slice(1).forEach(tab => { tab.tabIndex = -1; });
      if (isArtisan && window.location.hash === "#activity") selectTab(tabs[1]);
      else if (isArtisan) loadProducts();
    })
    .catch(showError);
}
