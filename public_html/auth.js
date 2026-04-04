(function () {
  function getParams() {
    return new URLSearchParams(window.location.search || "");
  }

  function applyLoginState() {
    var loginForm = document.getElementById("login-form");
    if (!loginForm) {
      return;
    }

    var params = getParams();
    var nextInput = document.getElementById("next");
    var nextValue = params.get("next") || "/admin";

    if (nextInput) {
      nextInput.value = nextValue;
    }

    var errorBox = document.getElementById("login-error");
    if (errorBox && params.get("error") === "1") {
      errorBox.classList.add("is-visible");
    }
  }

  function applyAdminState() {
    var emailNode = document.querySelector("[data-admin-email]");
    if (!emailNode) {
      return;
    }

    var value = emailNode.getAttribute("data-admin-email");
    if (value) {
      emailNode.textContent = value;
    }
  }

  function init() {
    applyLoginState();
    applyAdminState();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
