import { renderScore } from "./score-view.js";
import { calculateAge, calculateCalendar } from "./calendar-engine.js";
import { BASE4_NAMES, HOUSE_NAMES, calculateNineBases } from "./chart-engine.js";
import { buildRelationColumns, getLinkedCellKeys } from "./relation-engine.js";
import { toggleSelection, selectionHighlights, houseAppearance, isSpecialResult } from "./selection-engine.js";
import { exportChartAsPdf, exportChartAsPng } from "./export-engine.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));
const FAVORITES_KEY = "sevenstar-ninebase-favorites-v1";
const THAI_MONTHS = ["", "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

let latestCalendar = null;
let latestChart = null;
let selections = new Map();

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((item) => [item.type, item.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function parseIso(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function formatThaiDate(iso) {
  const { year, month, day } = parseIso(iso);
  return `${day} ${THAI_MONTHS[month]} ${year + 543}`;
}

function formValues() {
  return {
    name: $("#person-name").value.trim(),
    day: Number($("#birth-day").value),
    month: Number($("#birth-month").value),
    yearBe: Number($("#birth-year").value),
    time: $("#birth-time").value,
    asOf: $("#as-of-date").value,
    ageMode: $("input[name='age-mode']:checked").value,
  };
}

function showError(message) {
  const target = $("#form-error");
  target.textContent = message;
  target.hidden = false;
}

function clearError() {
  $("#form-error").hidden = true;
}

function setView(name) {
  $$(".tab").forEach((button) => button.classList.toggle("is-active", button.dataset.view === name));
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.id === `view-${name}`));
  if (name === "favorites") renderFavorites();
}

function fillSeedSelects(seeds) {
  [["#override-day", seeds.day], ["#override-month", seeds.month], ["#override-zodiac", seeds.zodiac]].forEach(([selector, selected]) => {
    $(selector).innerHTML = Array.from({ length: 7 }, (_, index) => {
      const value = index + 1;
      return `<option value="${value}" ${value === selected ? "selected" : ""}>${value}</option>`;
    }).join("");
  });
}

function renderCalendarSummary(calendar, age, mode) {
  $("#effective-date").textContent = formatThaiDate(calendar.effectiveDate);
  $("#day-shift-note").textContent = calendar.shifted
    ? `เกิดก่อน 06:00 น.\nย้อนจาก ${formatThaiDate(calendar.civilDate)} 1 วัน`
    : "ใช้วันเดียวกับวันเกิดตามทะเบียน";
  $("#calendar-summary").textContent = `${calendar.weekday.name} · ${calendar.lunar.monthName} · ปี${calendar.zodiac.name}`;
  $("#lunar-detail").textContent = `${calendar.lunar.phase} ${calendar.lunar.lunarDay} ค่ำ · จ.ศ. ${calendar.lunar.chulasakarat} · ปี${calendar.lunar.yearType}`;
  $("#seed-summary").textContent = `${calendar.seeds.day} · ${calendar.seeds.month} · ${calendar.seeds.zodiac}`;
  $("#age-label").textContent = mode === "entering" ? "อายุย่าง" : "อายุเต็ม";
  $("#age-main").textContent = `${mode === "entering" ? age.entering : age.completed} ปี`;
  $("#age-detail").textContent = `อายุจริง ${age.years} ปี ${age.months} เดือน ${age.days} วัน`;
}

function cellLabel(baseNumber, column, value, chart) {
  const house = HOUSE_NAMES[baseNumber]?.[column];
  if (baseNumber === 4) return `ฐาน 4 ช่อง ${column + 1} ผลรวม ${value} ${BASE4_NAMES[value]}`;
  return `ฐาน ${baseNumber} ช่อง ${column + 1}${house ? ` ตำแหน่ง${house}` : ""} เลข ${value}`;
}

function renderRelationRow(chart) {
  const row = document.createElement("div");
  row.className = "relation-row";
  row.innerHTML = '<div class="relation-label" aria-hidden="true"></div>';
  buildRelationColumns(chart).forEach(({ column, relations }) => {
    const cell = document.createElement("div");
    cell.className = "relation-cell";
    cell.dataset.column = String(column);
    relations.forEach(({ name, style }) => {
      const label = document.createElement("span");
      label.className = `relation-name relation-style-${style}`;
      label.textContent = name;
      cell.appendChild(label);
    });
    row.appendChild(cell);
  });
  return row;
}

function renderChart(chart) {
  renderScore(chart, $("#reading-topic").value);
  clearCellSelection();
  const container = $("#nine-base-chart");
  container.innerHTML = "";
  chart.bases.forEach((values, baseIndex) => {
    const baseNumber = baseIndex + 1;
    const row = document.createElement("div");
    row.className = `base-row${baseNumber >= 5 && baseNumber <= 7 ? " is-secondary-base" : ""}`;
    row.innerHTML = `<div class="base-label">ฐาน ${baseNumber}</div>`;
    values.forEach((value, column) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "base-cell";
      button.dataset.base = String(baseNumber);
      button.dataset.column = String(column + 1);
      button.dataset.value = String(value);
      const house = HOUSE_NAMES[baseNumber]?.[column] || "";
      if (baseNumber === 4) {
        button.innerHTML = `<span class="number">${value}</span><span class="result-name ${isSpecialResult(value) ? "" : "plain-result"}">${chart.base4Names[column]}</span>`;
      } else {
        button.innerHTML = `<span class="house ${houseAppearance(baseNumber, column + 1).className}">${house}</span><span class="number">${value}</span>`;
      }
      button.setAttribute("aria-pressed", "false");
      button.setAttribute("aria-label", cellLabel(baseNumber, column, value, chart));
      button.addEventListener("click", () => selectCell(button, chart));
      row.appendChild(button);
    });
    container.appendChild(row);
    if (baseNumber === 3) {
      container.appendChild(renderRelationRow(chart));
    }
  });
}

function selectCell(target, chart) {
  selections = toggleSelection(chart, selections, target.dataset.base, target.dataset.column);
  const highlights = selectionHighlights(chart, selections);
  $$(".base-cell").forEach((cell) => {
    const key = `${cell.dataset.base}:${cell.dataset.column}`;
    cell.classList.toggle("is-selected", highlights.selected.has(key));
    cell.classList.toggle("is-related", highlights.related.has(key));
    cell.setAttribute("aria-pressed", String(highlights.selected.has(key)));
  });
  $("#cell-detail").textContent = selections.size
    ? `เลือก ${selections.size}/7 ชุด · เลขดาว ${[...selections.keys()].sort().join(" · ")} · คลิกช่องเดิมซ้ำเพื่อยกเลิกชุดนั้น`
    : "คลิกตำแหน่งในแผนผังเพื่อเลือกได้สูงสุด 7 ชุด";
}

function clearCellSelection() {
  selections = new Map();
  $$(".base-cell").forEach((cell) => {
    cell.classList.remove("is-selected", "is-related", "is-vertical-related");
    cell.setAttribute("aria-pressed", "false");
  });
  $("#cell-detail").textContent = "คลิกตำแหน่งในแผนผังเพื่อเลือกได้สูงสุด 7 ชุด";
}

function calculateAgeFromForm(values) {
  const birth = { year: values.yearBe - 543, month: values.month, day: values.day };
  const asOf = parseIso(values.asOf);
  return calculateAge(birth, asOf);
}

async function processForm(event) {
  event?.preventDefault();
  clearError();
  try {
    const values = formValues();
    const calendar = await calculateCalendar(values);
    const age = calculateAgeFromForm(values);
    const chart = calculateNineBases(calendar.seeds.day, calendar.seeds.month, calendar.seeds.zodiac);
    latestCalendar = calendar;
    latestChart = chart;
    renderCalendarSummary(calendar, age, values.ageMode);
    fillSeedSelects(calendar.seeds);
    renderChart(chart);
    $("#result-area").hidden = false;
    updateFavoriteButton();
  } catch (error) {
    $("#result-area").hidden = true;
    showError(error.message || "ไม่สามารถคำนวณแผนผังได้");
  }
}

function applyOverride() {
  if (!latestCalendar) return;
  const seeds = {
    day: Number($("#override-day").value),
    month: Number($("#override-month").value),
    zodiac: Number($("#override-zodiac").value),
  };
  latestChart = calculateNineBases(seeds.day, seeds.month, seeds.zodiac);
  renderChart(latestChart);
  $("#seed-summary").textContent = `${seeds.day} · ${seeds.month} · ${seeds.zodiac}`;
  $("#seed-summary").nextElementSibling.textContent = "ค่าที่ผู้ใช้ยืนยัน · ใช้เฉพาะรอบนี้";
}

async function handleChartExport(format, button) {
  if (!latestCalendar || !latestChart) return;
  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = "กำลังบันทึก…";
  try {
    const options = {
      chart: latestChart,
      calendar: latestCalendar,
      personName: formValues().name,
      highlights: selectionHighlights(latestChart, selections),
      topic: $("#reading-topic").value,
    };
    if (format === "pdf") await exportChartAsPdf(options);
    else await exportChartAsPng(options);
    $("#cell-detail").textContent = `บันทึกแผนผังเป็น ${format.toUpperCase()} แล้ว`;
  } catch (error) {
    $("#cell-detail").textContent = error.message || "ไม่สามารถบันทึกแผนผังได้";
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function readFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
  catch { return []; }
}

function writeFavorites(items) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
}

function favoriteId(values) {
  return `${values.name || "ไม่ระบุชื่อ"}|${values.yearBe}-${values.month}-${values.day}|${values.time}`;
}

function toggleFavorite() {
  const values = formValues();
  if (!values.name) {
    showError("กรุณากรอกชื่อเจ้าชะตาก่อนบันทึกรายการโปรด");
    $("#person-name").focus();
    return;
  }
  const id = favoriteId(values);
  const favorites = readFavorites();
  const index = favorites.findIndex((item) => item.id === id);
  if (index >= 0) favorites.splice(index, 1);
  else favorites.unshift({ id, ...values, savedAt: new Date().toISOString() });
  writeFavorites(favorites);
  updateFavoriteButton();
}

function updateFavoriteButton() {
  const button = $("#favorite-button");
  const saved = readFavorites().some((item) => item.id === favoriteId(formValues()));
  button.classList.toggle("is-saved", saved);
  button.textContent = saved ? "★" : "☆";
  button.title = saved ? "ยกเลิกรายการโปรด" : "บันทึกรายการโปรด";
}

function renderFavorites() {
  const favorites = readFavorites();
  const list = $("#favorite-list");
  if (!favorites.length) {
    list.innerHTML = '<div class="empty-list">ยังไม่มีเจ้าชะตาที่บันทึกไว้</div>';
    return;
  }
  list.innerHTML = favorites.map((item) => `
    <article class="favorite-item">
      <button type="button" data-open-favorite="${encodeURIComponent(item.id)}">
        <strong>${escapeHtml(item.name)}</strong><br>
        <small>${item.day} ${THAI_MONTHS[item.month]} ${item.yearBe} เวลา ${item.time}</small>
      </button>
      <button class="remove-favorite" type="button" data-remove-favorite="${encodeURIComponent(item.id)}">ลบ</button>
    </article>
  `).join("");
}

function escapeHtml(text) {
  const element = document.createElement("span");
  element.textContent = text;
  return element.innerHTML;
}

function loadFavorite(item) {
  $("#person-name").value = item.name;
  $("#birth-day").value = item.day;
  $("#birth-month").value = item.month;
  $("#birth-year").value = item.yearBe;
  $("#birth-time").value = item.time;
  $("#as-of-date").value = item.asOf || bangkokToday();
  const radio = $(`input[name='age-mode'][value='${item.ageMode || "completed"}']`);
  if (radio) radio.checked = true;
  setView("natal");
  processForm();
}

function initializeRange() {
  const today = parseIso(bangkokToday());
  const yearInput = $("#birth-year");
  yearInput.min = String(today.year + 543 - 100);
  yearInput.max = String(today.year + 543 + 100);
  $("#as-of-date").value = bangkokToday();
}

$$('.tab').forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
$("#birth-form").addEventListener("submit", processForm);
$("#apply-override").addEventListener("click", applyOverride);
$("#clear-selection").addEventListener("click", clearCellSelection);
$("#export-png").addEventListener("click", (event) => handleChartExport("png", event.currentTarget));
$("#export-pdf").addEventListener("click", (event) => handleChartExport("pdf", event.currentTarget));
$("#favorite-button").addEventListener("click", toggleFavorite);
$("#clear-favorites").addEventListener("click", () => {
  if (readFavorites().length && confirm("ล้างรายการโปรดทั้งหมดในเครื่องนี้หรือไม่")) {
    writeFavorites([]); renderFavorites(); updateFavoriteButton();
  }
});
$("#favorite-list").addEventListener("click", (event) => {
  const openButton = event.target.closest("[data-open-favorite]");
  const removeButton = event.target.closest("[data-remove-favorite]");
  if (openButton) {
    const id = decodeURIComponent(openButton.dataset.openFavorite);
    const item = readFavorites().find((favorite) => favorite.id === id);
    if (item) loadFavorite(item);
  }
  if (removeButton) {
    const id = decodeURIComponent(removeButton.dataset.removeFavorite);
    writeFavorites(readFavorites().filter((item) => item.id !== id));
    renderFavorites(); updateFavoriteButton();
  }
});
$$('input[name="age-mode"]').forEach((radio) => radio.addEventListener("change", () => {
  if (latestCalendar) processForm();
}));

initializeRange();

$("#reading-topic").addEventListener("change", () => { if(latestChart) renderScore(latestChart, $("#reading-topic").value); });
