const auth = SunnyApi.requireAuth("artesao");
const form = document.getElementById("addProductForm");
const fileInput = document.getElementById("mainImage");
const statusMessage = document.getElementById("productStatus");
const submitButton = document.getElementById("submitProduct");
const imagePicker = document.getElementById("imagePicker");
const preview = document.getElementById("mainPreview");
const imageUploadText = document.getElementById("imageUploadText");
const selectedFile = document.getElementById("selectedFile");
const productCode = new URLSearchParams(window.location.search).get("cod");
let existingProduct;
let previewUrl;

if (auth) {
  const photoIsRequired = !productCode;
  fileInput.required = photoIsRequired;
  document.getElementById("photoRequired").hidden = !photoIsRequired;

  if (productCode) {
    document.getElementById("formTitle").textContent = "Editar produto";
    submitButton.textContent = "Salvar alterações";
    fileInput.required = false;
    loadProduct();
  }

  async function loadProduct() {
    try {
      existingProduct = await SunnyApi.apiRequest(`/api/produtos/${encodeURIComponent(productCode)}`);
      if (Number(existingProduct.artesao) !== Number(auth.cod)) {
        throw new Error("Você não tem permissão para editar este produto.");
      }
      form.elements.productName.value = existingProduct.nome;
      form.elements.productDescription.value = existingProduct.descricao;
      form.elements.productPrice.value = existingProduct.preco_custo;
      form.elements.productStock.value = existingProduct.estoque;
      const image = document.createElement("img");
      image.className = "preview-image";
      image.alt = `Foto atual de ${existingProduct.nome}`;
      image.src = existingProduct.fotoUrl;
      preview.replaceChildren(image);
      preview.hidden = false;
      imageUploadText.textContent = "Clique para substituir a foto";
      selectedFile.textContent = "A foto atual será mantida se nenhuma nova imagem for selecionada.";
    } catch (error) {
      statusMessage.textContent = error.message;
      submitButton.disabled = true;
    }
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = undefined;
    preview.replaceChildren();
    preview.hidden = true;
    selectedFile.textContent = "";
    imageUploadText.textContent = productCode
      ? "Clique para substituir a foto"
      : "Clique para escolher uma foto";
  }

  function selectImage(file) {
    clearPreview();
    if (!file) return;
    if (file.size > 60 * 1024) {
      fileInput.setCustomValidity("A foto deve ter até 60 KB nesta versão.");
      fileInput.reportValidity();
      fileInput.value = "";
      return;
    }
    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      fileInput.setCustomValidity("Escolha uma foto JPEG, PNG, GIF ou WebP.");
      fileInput.reportValidity();
      fileInput.value = "";
      return;
    }
    fileInput.setCustomValidity("");
    previewUrl = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.className = "preview-image";
    image.alt = `Prévia da foto ${file.name}`;
    image.src = previewUrl;
    preview.replaceChildren(image);
    preview.hidden = false;
    imageUploadText.textContent = "Foto selecionada";
    selectedFile.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
  }

  fileInput.addEventListener("change", () => {
    selectImage(fileInput.files[0]);
  });

  ["dragenter", "dragover"].forEach(eventName => {
    imagePicker.addEventListener(eventName, event => {
      event.preventDefault();
      imagePicker.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach(eventName => {
    imagePicker.addEventListener(eventName, event => {
      event.preventDefault();
      imagePicker.classList.remove("is-dragging");
    });
  });
  imagePicker.addEventListener("drop", event => {
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const files = new DataTransfer();
    files.items.add(file);
    fileInput.files = files.files;
    selectImage(file);
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();
    statusMessage.textContent = "";
    if (productCode && !existingProduct) return;

    const body = new FormData();
    body.set("nome", form.elements.productName.value.trim());
    body.set("descricao", form.elements.productDescription.value.trim());
    body.set("preco_custo", form.elements.productPrice.value);
    body.set("estoque", form.elements.productStock.value);
    if (fileInput.files[0]) body.set("foto", fileInput.files[0]);

    submitButton.disabled = true;
    try {
      await SunnyApi.apiRequest(
        productCode ? `/api/produtos/${encodeURIComponent(productCode)}` : "/api/produtos",
        { method: productCode ? "PATCH" : "POST", body }
      );
      window.location.assign("profile.html#activity");
    } catch (error) {
      statusMessage.textContent = error.message;
      submitButton.disabled = false;
    }
  });
}
