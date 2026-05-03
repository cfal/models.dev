// src/index.ts
var modal = document.getElementById("modal");
var modalClose = document.getElementById("close");
var help = document.getElementById("help");
var search = document.getElementById("search");
function getQueryParams() {
  return new URLSearchParams(window.location.search);
}
function updateQueryParams(updates) {
  const params = getQueryParams();
  for (const [key, value] of Object.entries(updates)) {
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
  }
  const newPath = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
  window.history.pushState({}, "", newPath);
}
function getColumnNameForURL(headerEl) {
  const text = headerEl.textContent?.trim().toLowerCase() || "";
  return text.replace(/↑|↓/g, "").trim().split(/\s+/).slice(0, 2).join("-");
}
function getColumnIndexByUrlName(name) {
  const headers = document.querySelectorAll("th.sortable");
  return Array.from(headers).findIndex((header) => getColumnNameForURL(header) === name);
}
var y = 0;
help.addEventListener("click", () => {
  y = window.scrollY;
  document.body.style.position = "fixed";
  document.body.style.top = `-${y}px`;
  modal.showModal();
});
function closeDialog() {
  modal.close();
  document.body.style.position = "";
  document.body.style.top = "";
  window.scrollTo(0, y);
}
modalClose.addEventListener("click", closeDialog);
modal.addEventListener("cancel", closeDialog);
modal.addEventListener("click", (e) => {
  if (e.target === modal)
    closeDialog();
});
var currentSort = { column: -1, direction: "asc" };
function sortTable(column, direction) {
  const header = document.querySelectorAll("th.sortable")[column];
  const columnType = header.getAttribute("data-type");
  if (!columnType)
    return;
  currentSort = { column, direction };
  updateQueryParams({
    sort: getColumnNameForURL(header),
    order: direction
  });
  const tbody = document.querySelector("table tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.sort((a, b) => {
    const aValue = getCellValue(a.cells[column], columnType);
    const bValue = getCellValue(b.cells[column], columnType);
    if (aValue === undefined && bValue === undefined)
      return 0;
    if (aValue === undefined)
      return 1;
    if (bValue === undefined)
      return -1;
    let comparison = 0;
    if (columnType === "number" || columnType === "modalities") {
      comparison = aValue - bValue;
    } else if (columnType === "boolean") {
      comparison = aValue.localeCompare(bValue);
    } else {
      comparison = aValue.localeCompare(bValue);
    }
    return direction === "asc" ? comparison : -comparison;
  });
  rows.forEach((row) => tbody.appendChild(row));
  const headers = document.querySelectorAll("th.sortable");
  headers.forEach((header2, i) => {
    const indicator = header2.querySelector(".sort-indicator");
    if (i === column) {
      indicator.textContent = direction === "asc" ? "↑" : "↓";
    } else {
      indicator.textContent = "";
    }
  });
}
function getCellValue(cell, type) {
  if (type === "modalities")
    return cell.querySelectorAll(".modality-icon").length;
  const text = cell.textContent?.trim() || "";
  if (text === "-")
    return;
  if (type === "number")
    return parseFloat(text.replace(/[$,]/g, "")) || 0;
  return text;
}
document.querySelectorAll("th.sortable").forEach((header) => {
  header.addEventListener("click", () => {
    const column = Array.from(header.parentElement.children).indexOf(header);
    const direction = currentSort.column === column && currentSort.direction === "asc" ? "desc" : "asc";
    sortTable(column, direction);
  });
});
function filterTable(value) {
  const lowerCaseValues = value.toLowerCase().split(",").filter((str) => str.trim() !== "");
  const rows = document.querySelectorAll("table tbody tr");
  rows.forEach((row) => {
    const cellTexts = Array.from(row.cells).map((cell) => cell.textContent.toLowerCase());
    const isVisible = lowerCaseValues.length === 0 || lowerCaseValues.some((lowerCaseValue) => cellTexts.some((text) => text.includes(lowerCaseValue)));
    row.style.display = isVisible ? "" : "none";
  });
  updateQueryParams({ search: value || null });
}
search.addEventListener("input", () => {
  filterTable(search.value);
});
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "k") {
    e.preventDefault();
    search.focus();
  }
});
search.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    search.value = "";
    search.dispatchEvent(new Event("input"));
  }
});
window.copyModelId = async (button, modelId) => {
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(modelId);
      const copyIcon = button.querySelector(".copy-icon");
      const checkIcon = button.querySelector(".check-icon");
      copyIcon.style.display = "none";
      checkIcon.style.display = "block";
      setTimeout(() => {
        copyIcon.style.display = "block";
        checkIcon.style.display = "none";
      }, 1000);
    }
  } catch (err) {
    console.error("Failed to copy text: ", err);
  }
};
function initializeFromURL() {
  const params = getQueryParams();
  (() => {
    const searchQuery = params.get("search");
    if (!searchQuery)
      return;
    search.value = searchQuery;
    filterTable(searchQuery);
  })();
  (() => {
    const columnName = params.get("sort");
    if (!columnName)
      return;
    const columnIndex = getColumnIndexByUrlName(columnName);
    if (columnIndex === -1)
      return;
    const direction = params.get("order") || "asc";
    sortTable(columnIndex, direction);
  })();
}
document.addEventListener("DOMContentLoaded", initializeFromURL);
window.addEventListener("popstate", initializeFromURL);
