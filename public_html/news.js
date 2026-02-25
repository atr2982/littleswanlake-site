(function () {
  var list = document.getElementById("news-list");
  var status = document.getElementById("news-status");
  var empty = document.getElementById("news-empty");
  var searchForm = document.getElementById("news-filter-search");
  var searchInput = document.getElementById("news-filter-input");

  if (!list || !status || !empty || !searchForm || !searchInput) return;

  var items = Array.prototype.slice.call(list.querySelectorAll(".news-item"));

  function updateStatus(visibleCount) {
    var suffix = visibleCount === 1 ? "" : "s";
    status.textContent = "Showing " + visibleCount + " link" + suffix;
    empty.hidden = visibleCount !== 0;
  }

  function runFilter() {
    var query = searchInput.value.toLowerCase().trim();
    var visible = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var name = (item.getAttribute("data-name") || "").toLowerCase();
      var matches = query === "" || name.indexOf(query) !== -1;
      item.classList.toggle("hidden", !matches);
      if (matches) visible += 1;
    }

    updateStatus(visible);
  }

  var debounceTimer = null;
  searchInput.addEventListener("input", function () {
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
    }
    debounceTimer = window.setTimeout(runFilter, 180);
  });

  searchForm.addEventListener("submit", function (event) {
    event.preventDefault();
    if (debounceTimer) {
      window.clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    runFilter();
  });

  runFilter();
})();
