(function () {
      var menu = document.getElementById("menu");
      var toggle = menu ? menu.querySelector(".menu-toggle") : null;
      var list = document.getElementById("menu-list");
      var sidebarToggle = document.querySelector(".sidebar-toggle");
      var sidebar = document.getElementById("sidebar");
      var sidebarClose = document.querySelector(".sidebar-close");
      if (!menu || !toggle || !list) return;

      function normalizePath(rawPath) {
        if (!rawPath) return "/";
        var path = rawPath;
        path = path.replace(/\\/g, "/");
        path = path.replace(/\/{2,}/g, "/");
        if (path.length > 1 && path.charAt(path.length - 1) === "/") {
          path = path.slice(0, -1);
        }
        if (path === "/index.html") {
          return "/";
        }
        return path || "/";
      }

      function toPath(href) {
        if (!href) return "";
        try {
          var parsed = new URL(href, window.location.href);
          return normalizePath(parsed.pathname || "/");
        } catch (err) {
          return "";
        }
      }

      function markActiveNav() {
        var current = normalizePath(window.location.pathname || "/");
        var topItems = list.children;

        for (var i = 0; i < topItems.length; i++) {
          var item = topItems[i];
          if (!item || !item.tagName || item.tagName.toLowerCase() !== "li") continue;
          if (item.classList.contains("mobile-only")) continue;

          item.classList.remove("active");

          var link = null;
          for (var c = 0; c < item.children.length; c++) {
            if (item.children[c].tagName && item.children[c].tagName.toLowerCase() === "a") {
              link = item.children[c];
              break;
            }
          }
          if (link) {
            if (toPath(link.getAttribute("href")) === current) {
              item.classList.add("active");
            }
            continue;
          }

          if (item.classList.contains("has-nav-dropdown")) {
            var dropdownLinks = item.querySelectorAll(".nav-dropdown a");
            for (var j = 0; j < dropdownLinks.length; j++) {
              if (toPath(dropdownLinks[j].getAttribute("href")) === current) {
                item.classList.add("active");
                break;
              }
            }
          }
        }
      }

      markActiveNav();

      function closeNavDropdowns() {
        var openNavDropdowns = list.querySelectorAll(".nav-dropdown-open");
        for (var k = 0; k < openNavDropdowns.length; k++) {
          openNavDropdowns[k].classList.remove("nav-dropdown-open");
          var navToggle = openNavDropdowns[k].querySelector(".nav-dropdown-toggle");
          if (navToggle) {
            navToggle.setAttribute("aria-expanded", "false");
          }
        }
      }

      function setOpen(isOpen) {
        menu.classList.toggle("menu-open", isOpen);
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        if (!isOpen) {
          closeNavDropdowns();
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
        if (!menu.contains(e.target)) {
          closeNavDropdowns();
        }
      });

      document.addEventListener("click", function (e) {
        if (!menu.classList.contains("menu-open")) return;
        if (menu.contains(e.target)) return;
        setOpen(false);
      });

      list.addEventListener("click", function (e) {
        if (e.target && e.target.tagName === "A") {
          closeNavDropdowns();
          setOpen(false);
        }
      });

      list.addEventListener("click", function (e) {
        var navToggleBtn = e.target && e.target.classList && e.target.classList.contains("nav-dropdown-toggle")
          ? e.target
          : (e.target && e.target.closest ? e.target.closest(".nav-dropdown-toggle") : null);
        if (!navToggleBtn) return;
        if (!window.matchMedia("(max-width: 640px)").matches) return;
        var navItem = navToggleBtn.closest("li");
        if (!navItem) return;

        var currentState = navItem.classList.contains("nav-dropdown-open");
        closeNavDropdowns();
        navItem.classList.toggle("nav-dropdown-open", !currentState);
        navToggleBtn.setAttribute("aria-expanded", !currentState ? "true" : "false");
        e.preventDefault();
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
          closeNavDropdowns();
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

