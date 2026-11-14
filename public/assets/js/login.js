const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("message");
const loginButton = document.getElementById("loginSubmit");

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  loginMessage.textContent = "";
  loginMessage.className = "message";
  loginMessage.style.display = "none";
  loginButton.disabled = true;

  try {
    const result = await SunnyApi.apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        tipo: loginForm.elements.accountType.value,
        email: loginForm.elements.loginInput.value.trim(),
        senha: loginForm.elements.password.value
      })
    });
    SunnyApi.saveAuth({ token: result.token, tipo: result.tipo, cod: result.cod });
    window.location.assign("mockup-ux.html");
  } catch (error) {
    loginMessage.textContent = error.message;
    loginMessage.className = "message error";
    loginMessage.style.display = "block";
  } finally {
    loginButton.disabled = false;
  }
});
