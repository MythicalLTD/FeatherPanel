/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var input = document.querySelector('[data-fp-search]');
    if (!input) return;

    var items = Array.prototype.slice.call(document.querySelectorAll('[data-fp-search-item]'));
    var empty = document.querySelector('[data-fp-search-empty]');

    function normalize(value) {
      return String(value || '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
    }

    function applyFilter() {
      var query = normalize(input.value);
      var visible = 0;

      items.forEach(function (item) {
        var haystack = normalize(item.getAttribute('data-fp-search-text') || item.textContent);
        var match = !query || haystack.indexOf(query) !== -1;
        item.classList.toggle('fp-hidden', !match);
        if (match) visible += 1;
      });

      if (empty) {
        empty.classList.toggle('fp-hidden', visible !== 0);
      }
    }

    input.addEventListener('input', applyFilter);
    applyFilter();
  });
})();
