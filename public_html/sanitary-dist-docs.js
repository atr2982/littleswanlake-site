(function () {
  var lists = Array.prototype.slice.call(document.querySelectorAll(".docs-grid"));
  var status = document.getElementById("docs-status");
  var empty = document.getElementById("docs-empty");
  var searchForm = document.getElementById("docs-filter-search");
  var searchInput = document.getElementById("docs-filter-input");

  if (!lists.length || !status || !empty || !searchForm || !searchInput) return;

  var items = [];
  for (var i = 0; i < lists.length; i++) {
    var listItems = Array.prototype.slice.call(lists[i].querySelectorAll(".doc-item"));
    for (var j = 0; j < listItems.length; j++) {
      items.push(listItems[j]);
    }
  }

  function updateStatus(visibleCount) {
    var suffix = visibleCount === 1 ? "" : "s";
    status.textContent = "Showing " + visibleCount + " document" + suffix;
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
