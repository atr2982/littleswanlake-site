(function () {
  var PAGE_LOADING_CLASS = "shared-chrome-pending";
  var PAGE_READY_CLASS = "shared-chrome-ready";
  var MASK_ID = "chrome-loading-mask";
  var BANNER_LOADING_CLASS = "banner-loading";
  var BANNER_READY_CLASS = "banner-ready";
  var BANNER_WAIT_TIMEOUT_MS = 4500;

  function normalizePath(rawPath) {
    if (!rawPath) return "/";
    var path = rawPath.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
    if (path.length > 1 && path.charAt(path.length - 1) === "/") {
      path = path.slice(0, -1);
    }
    if (path === "/index.html") return "/";
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

  function ensureLoadingMask() {
    var existingMask = document.getElementById(MASK_ID);
    if (existingMask) return existingMask;

    var mask = document.createElement("div");
    mask.id = MASK_ID;
    mask.setAttribute("aria-hidden", "true");
    document.body.appendChild(mask);
    return mask;
  }

  function setPageLoading(isLoading) {
    if (!document.body) return;
    if (isLoading) {
      ensureLoadingMask();
      document.body.classList.add(PAGE_LOADING_CLASS);
      document.body.classList.remove(PAGE_READY_CLASS);
      return;
    }
    document.body.classList.remove(PAGE_LOADING_CLASS);
    document.body.classList.add(PAGE_READY_CLASS);
  }

  function buildTemplateCandidates() {
    var rawCandidates = ["template.html", "../template.html", "/template.html"];
    var absCandidates = [];
    for (var i = 0; i < rawCandidates.length; i++) {
      try {
        var abs = new URL(rawCandidates[i], window.location.href).href;
        if (absCandidates.indexOf(abs) === -1) {
          absCandidates.push(abs);
        }
      } catch (err) {
      }
    }
    return absCandidates;
  }

  function fetchTemplateDocument() {
    var candidates = buildTemplateCandidates();
    var index = 0;

    function next() {
      if (index >= candidates.length) {
        return Promise.reject(new Error("Unable to load template.html"));
      }

      var url = candidates[index];
      index += 1;

      return fetch(url, { credentials: "same-origin", cache: "no-store" })
        .then(function (response) {
          if (!response.ok) {
            throw new Error("Template fetch failed: " + response.status);
          }
          return response.text();
        })
        .then(function (html) {
          var parser = new DOMParser();
          var doc = parser.parseFromString(html, "text/html");
          return { doc: doc, baseUrl: url };
        })
        .catch(function () {
          return next();
        });
    }

    return next();
  }

  function toAbsolutePathLike(value, baseUrl) {
    if (!value) return value;
    if (value.charAt(0) === "#") return value;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(value)) return value;

    try {
      var abs = new URL(value, baseUrl);
      return abs.pathname + abs.search + abs.hash;
    } catch (err) {
      return value;
    }
  }

  function absolutizeSharedNodeUrls(rootNode, baseUrl) {
    if (!rootNode) return;
    var urlNodes = rootNode.querySelectorAll("[href], [src]");
    for (var i = 0; i < urlNodes.length; i++) {
      var node = urlNodes[i];
      if (node.hasAttribute("href")) {
        node.setAttribute("href", toAbsolutePathLike(node.getAttribute("href"), baseUrl));
      }
      if (node.hasAttribute("src")) {
        node.setAttribute("src", toAbsolutePathLike(node.getAttribute("src"), baseUrl));
      }
    }
  }

  function replaceNodeFromTemplate(id, templateDoc, baseUrl) {
    var source = templateDoc.getElementById(id);
    var target = document.getElementById(id);
    if (!source || !target || !target.parentNode) return;

    var clone = source.cloneNode(true);
    absolutizeSharedNodeUrls(clone, baseUrl);
    target.parentNode.replaceChild(clone, target);
  }

  function syncHeadFromTemplate(templateDoc, baseUrl) {
    if (!templateDoc || !document.head) return;

    var templateTitle = templateDoc.querySelector("title");
    if (templateTitle) {
      document.title = templateTitle.textContent || "Little Swan Lake";
    }

    var templateIcon = templateDoc.querySelector('link[rel~="icon"]');
    if (!templateIcon) return;

    var iconHref = toAbsolutePathLike(templateIcon.getAttribute("href"), baseUrl);
    if (!iconHref) return;

    var currentIcon = document.querySelector('link[rel~="icon"]');
    if (!currentIcon) {
      currentIcon = document.createElement("link");
      currentIcon.setAttribute("rel", "icon");
      currentIcon.setAttribute("type", "image/png");
      document.head.appendChild(currentIcon);
    }
    currentIcon.setAttribute("href", iconHref);
  }

  function replaceHomeToolbar(templateDoc, baseUrl) {
    var sourceToolbar = templateDoc.querySelector(".home-toolbar");
    var targetToolbar = document.querySelector(".home-toolbar");
    if (!sourceToolbar || !targetToolbar || !targetToolbar.parentNode) return;

    var clone = sourceToolbar.cloneNode(true);
    absolutizeSharedNodeUrls(clone, baseUrl);
    targetToolbar.parentNode.replaceChild(clone, targetToolbar);
  }

  function syncSharedChromeFromTemplate() {
    var currentPath = normalizePath(window.location.pathname || "/");
    if (currentPath === "/template.html") {
      return Promise.resolve();
    }
    if (typeof window.fetch !== "function" || typeof window.DOMParser !== "function") {
      return Promise.resolve();
    }

    return fetchTemplateDocument().then(function (payload) {
      syncHeadFromTemplate(payload.doc, payload.baseUrl);
      replaceNodeFromTemplate("topbar", payload.doc, payload.baseUrl);
      replaceNodeFromTemplate("menu", payload.doc, payload.baseUrl);
      replaceNodeFromTemplate("splash", payload.doc, payload.baseUrl);
      replaceNodeFromTemplate("sidebar", payload.doc, payload.baseUrl);
      replaceNodeFromTemplate("footer", payload.doc, payload.baseUrl);
      replaceHomeToolbar(payload.doc, payload.baseUrl);
    });
  }

  function ensureBannerPreloads(splash) {
    if (!splash) return;
    var images = splash.querySelectorAll(".banner-tile img");
    if (!images.length) return;

    var existing = document.querySelectorAll('link[rel="preload"][as="image"]');
    var existingMap = {};
    for (var i = 0; i < existing.length; i++) {
      var href = existing[i].getAttribute("href");
      if (!href) continue;
      try {
        existingMap[new URL(href, window.location.href).href] = true;
      } catch (err) {
      }
    }

    for (var j = 0; j < images.length; j++) {
      var src = images[j].getAttribute("src");
      if (!src) continue;
      try {
        var absolute = new URL(src, window.location.href).href;
        if (existingMap[absolute]) continue;

        var preload = document.createElement("link");
        preload.setAttribute("rel", "preload");
        preload.setAttribute("as", "image");
        preload.setAttribute("href", absolute);
        document.head.appendChild(preload);
        existingMap[absolute] = true;
      } catch (err) {
      }
    }
  }

  function setupBannerStripLoad() {
    return new Promise(function (resolve) {
      var splash = document.getElementById("splash");
      if (!splash || !splash.classList.contains("banner-strip")) {
        resolve();
        return;
      }

      var bannerImages = splash.querySelectorAll(".banner-tile img");
      if (!bannerImages.length) {
        resolve();
        return;
      }

      ensureBannerPreloads(splash);
      splash.classList.add(BANNER_LOADING_CLASS);

      var loadedCount = 0;
      var complete = false;

      function finish() {
        if (complete) return;
        complete = true;
        splash.classList.remove(BANNER_LOADING_CLASS);
        splash.classList.add(BANNER_READY_CLASS);
        resolve();
      }

      function onImageSettled() {
        loadedCount += 1;
        if (loadedCount >= bannerImages.length) {
          finish();
        }
      }

      for (var i = 0; i < bannerImages.length; i++) {
        var img = bannerImages[i];
        img.setAttribute("loading", "eager");
        img.setAttribute("fetchpriority", "high");
        img.setAttribute("decoding", "async");

        if (img.complete) {
          onImageSettled();
          continue;
        }
        img.addEventListener("load", onImageSettled, { once: true });
        img.addEventListener("error", onImageSettled, { once: true });
      }

      setTimeout(finish, BANNER_WAIT_TIMEOUT_MS);
    });
  }

  function initInteractions() {
    var menu = document.getElementById("menu");
    var toggle = menu ? menu.querySelector(".menu-toggle") : null;
    var list = document.getElementById("menu-list");
    var sidebarToggle = document.querySelector(".sidebar-toggle");
    var sidebar = document.getElementById("sidebar");
    var sidebarClose = document.querySelector(".sidebar-close");

    function markActiveNav() {
      if (!list) return;
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

    function closeNavDropdowns() {
      if (!list) return;
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
      if (!menu || !toggle || !list) return;
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

    markActiveNav();

    if (toggle) {
      toggle.addEventListener("click", function () {
        setOpen(!menu.classList.contains("menu-open"));
      });
    }

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

    if (menu) {
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
    }

    if (list) {
      list.addEventListener("click", function (e) {
        if (e.target && e.target.tagName === "A") {
          closeNavDropdowns();
          setOpen(false);
        }
      });

      list.addEventListener("click", function (e) {
        var navToggleBtn =
          e.target && e.target.classList && e.target.classList.contains("nav-dropdown-toggle")
            ? e.target
            : e.target && e.target.closest
              ? e.target.closest(".nav-dropdown-toggle")
              : null;
        if (!navToggleBtn) return;
        if (!window.matchMedia("(max-width: 640px)").matches) return;

        var navItem = navToggleBtn.closest("li");
        if (!navItem) return;

        var currentState = navItem.classList.contains("nav-dropdown-open");
        closeNavDropdowns();
        navItem.classList.toggle("nav-dropdown-open", !currentState);
        navToggleBtn.setAttribute("aria-expanded", !currentState ? "true" : "false");
        navToggleBtn.blur();
        e.preventDefault();
      });

      list.addEventListener("click", function (e) {
        var toggleBtn =
          e.target && e.target.classList && e.target.classList.contains("submenu-toggle")
            ? e.target
            : e.target && e.target.closest
              ? e.target.closest(".submenu-toggle")
              : null;
        if (!toggleBtn) return;

        var item = toggleBtn.closest("li");
        if (!item) return;

        var isOpen = item.classList.contains("submenu-open");
        item.classList.toggle("submenu-open", !isOpen);
        toggleBtn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
        e.preventDefault();
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

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      closeNavDropdowns();
      setOpen(false);
      if (sidebarToggle) {
        document.body.classList.remove("sidebar-open");
        sidebarToggle.setAttribute("aria-expanded", "false");
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

    var lightbox = document.querySelector("[data-lightbox]");
    if (lightbox) {
      var lightboxImage = lightbox.querySelector("[data-lightbox-image]");
      var lightboxCaption = lightbox.querySelector("[data-lightbox-caption]");
      var lightboxClose = lightbox.querySelector("[data-lightbox-close]");
      var lastTrigger = null;

      function closeLightbox() {
        if (!lightbox.classList.contains("is-open")) return;
        lightbox.classList.remove("is-open");
        lightbox.setAttribute("hidden", "");
        lightbox.setAttribute("aria-hidden", "true");
        if (lightboxImage) {
          lightboxImage.setAttribute("src", "");
          lightboxImage.setAttribute("alt", "");
        }
        if (lightboxCaption) {
          lightboxCaption.textContent = "";
        }
        if (lastTrigger && typeof lastTrigger.focus === "function") {
          lastTrigger.focus();
        }
        lastTrigger = null;
      }

      function openLightbox(trigger) {
        if (!trigger || !lightboxImage) return;
        var href = trigger.getAttribute("href");
        if (!href) return;

        lastTrigger = trigger;
        lightboxImage.setAttribute("src", href);
        lightboxImage.setAttribute("alt", trigger.getAttribute("data-lightbox-alt") || trigger.textContent.trim() || "Expanded image");
        if (lightboxCaption) {
          lightboxCaption.textContent = trigger.getAttribute("data-lightbox-caption") || "";
        }
        lightbox.removeAttribute("hidden");
        lightbox.classList.add("is-open");
        lightbox.setAttribute("aria-hidden", "false");
        if (lightboxClose && typeof lightboxClose.focus === "function") {
          lightboxClose.focus();
        }
      }

      document.addEventListener("click", function (e) {
        var trigger =
          e.target && e.target.closest
            ? e.target.closest("[data-lightbox-trigger]")
            : null;
        if (trigger) {
          e.preventDefault();
          openLightbox(trigger);
          return;
        }

        if (!lightbox.classList.contains("is-open")) return;
        if (lightboxClose && lightboxClose.contains(e.target)) {
          e.preventDefault();
          closeLightbox();
          return;
        }
        if (e.target === lightbox) {
          closeLightbox();
        }
      });

      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          closeLightbox();
        }
      });
    }
  }

  function bootstrap() {
    setPageLoading(true);

    syncSharedChromeFromTemplate()
      .catch(function () {
      })
      .then(function () {
        initInteractions();
        return setupBannerStripLoad();
      })
      .then(function () {
        setPageLoading(false);
      }, function () {
        setPageLoading(false);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootstrap);
  } else {
    bootstrap();
  }
})();
