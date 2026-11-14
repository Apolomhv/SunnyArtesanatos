const accountTypeOptions = document.querySelectorAll('input[name="accountType"]');
const accountTypeMessage = document.getElementById("accountTypeMessage");
const registerForm = document.getElementById("registerForm");
const message = document.getElementById("message");
const submitButton = document.getElementById("registerSubmit");

accountTypeOptions.forEach(option => {
    option.addEventListener("change", () => {
        accountTypeMessage.textContent = option.value === "artesao"
            ? "Conta de artesão selecionada. Você poderá cadastrar produtos após criar a conta."
            : "Conta de comprador selecionada. Você poderá explorar e acompanhar seus pedidos.";
    });
});

registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    const selectedType = registerForm.querySelector('input[name="accountType"]:checked');
    if (!selectedType) return;

    message.textContent = "";
    message.className = "message";
    message.style.display = "none";
    submitButton.disabled = true;

    if (registerForm.elements.password.value !== registerForm.elements.confirmPassword.value) {
        message.textContent = "As senhas não coincidem.";
        message.className = "message error";
        message.style.display = "block";
        submitButton.disabled = false;
        return;
    }

    const digits = value => value.replace(/\D/g, "");
    const account = {
        nome: registerForm.elements.fullName.value.trim(),
        ddi: digits(registerForm.elements.ddi.value),
        ddd: digits(registerForm.elements.ddd.value),
        telefone: digits(registerForm.elements.phone.value),
        email: registerForm.elements.email.value.trim(),
        senha: registerForm.elements.password.value,
        cep: digits(registerForm.elements.cep.value),
        rua: registerForm.elements.street.value.trim(),
        numero: Number(registerForm.elements.number.value),
        bairro: registerForm.elements.neighborhood.value.trim(),
        cidade: registerForm.elements.city.value.trim(),
        uf: registerForm.elements.state.value,
    };

    try {
        const type = selectedType.value === "artesao" ? "artesao" : "cliente";
        const result = await SunnyApi.apiRequest(type === "artesao" ? "/api/artesaos" : "/api/clientes", {
            method: "POST",
            body: JSON.stringify(account)
        });
        SunnyApi.saveAuth({ token: result.token, tipo: result.tipo, cod: result.cod });
        window.location.assign("mockup-ux.html");
    } catch (error) {
        message.textContent = error.message;
        message.className = "message error";
        message.style.display = "block";
    } finally {
        submitButton.disabled = false;
    }
});
