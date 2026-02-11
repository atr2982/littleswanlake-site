(function () {
      var menu = document.getElementById("menu");
      var toggle = menu ? menu.querySelector(".menu-toggle") : null;
      var list = document.getElementById("menu-list");
      var sidebarToggle = document.querySelector(".sidebar-toggle");
      var sidebar = document.getElementById("sidebar");
      var sidebarClose = document.querySelector(".sidebar-close");
      if (!menu || !toggle || !list) return;

      function setOpen(isOpen) {
        menu.classList.toggle("menu-open", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (!isOpen) {
          var openSubs = list.querySelectorAll(".submenu-open");
          for (var i = 0; i < openSubs.length; i++) {
            openSubs[i].classList.remove("submenu-open");
          }
          var subToggles = list.querySelectorAll(".submenu-toggle[aria-expanded='true']");
          for (var j = 0; j < subToggles.length; j++) {
            subToggles[j].setAttribute("aria-expanded", "false");
          }
        }
      }

      toggle.addEventListener("click", function () {
        setOpen(!menu.classList.contains("menu-open"));
      });

      if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", function () {
          var isOpen = document.body.classList.toggle("sidebar-open");
          sidebarToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
      }
      if (sidebarClose && sidebarToggle) {
        sidebarClose.addEventListener("click", function () {
          document.body.classList.remove("sidebar-open");
          sidebarToggle.setAttribute("aria-expanded", "false");
        });
      }
      document.addEventListener("click", function (e) {
        if (!document.body.classList.contains("sidebar-open")) return;
        if (sidebar && sidebar.contains(e.target)) return;
        if (sidebarToggle && sidebarToggle.contains(e.target)) return;
        document.body.classList.remove("sidebar-open");
        if (sidebarToggle) {
          sidebarToggle.setAttribute("aria-expanded", "false");
        }
      });

      document.addEventListener("click", function (e) {
        if (!menu.classList.contains("menu-open")) return;
        if (menu.contains(e.target)) return;
        setOpen(false);
      });

      list.addEventListener("click", function (e) {
        if (e.target && e.target.tagName === "A") {
          setOpen(false);
        }
      });

      list.addEventListener("click", function (e) {
        var toggleBtn = e.target && e.target.classList && e.target.classList.contains("submenu-toggle")
          ? e.target
          : (e.target && e.target.closest ? e.target.closest(".submenu-toggle") : null);
        if (!toggleBtn) return;
        var item = toggleBtn.closest("li");
        if (!item) return;
        var isOpen = item.classList.contains("submenu-open");
        item.classList.toggle("submenu-open", !isOpen);
        toggleBtn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
        e.preventDefault();
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          setOpen(false);
          if (sidebarToggle) {
            document.body.classList.remove("sidebar-open");
            sidebarToggle.setAttribute("aria-expanded", "false");
          }
        }
      });

      var siteSearch = document.querySelector(".site-search");
      if (siteSearch) {
        var searchInput = siteSearch.querySelector("input[type='text']");
        var searchButton = siteSearch.querySelector("button[type='submit']");
        var syncSearchButton = function () {
          if (!searchButton || !searchInput) return;
          searchButton.disabled = !searchInput.value.trim();
        };
        if (searchInput && searchButton) {
          syncSearchButton();
          searchInput.addEventListener("input", syncSearchButton);
        }
        siteSearch.addEventListener("submit", function () {
          var input = siteSearch.querySelector("input[type='text']");
          if (input) {
            setTimeout(function () {
              input.value = "";
            }, 0);
          }
        });
      }
    })();

