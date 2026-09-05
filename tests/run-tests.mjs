import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateAge, calculateCalendar, setCalendarDatasetForTests } from "../js/calendar-engine.js";
import { calculateNineBases } from "../js/chart-engine.js";

const dataset = JSON.parse(await readFile(new URL("../data/lunar-month-boundaries.json", import.meta.url), "utf8"));
setCalendarDatasetForTests(dataset);

const beforeSix = await calculateCalendar({ day: 22, month: 4, yearBe: 2527, time: "01:49" });
assert.equal(beforeSix.effectiveDate, "1984-04-21");
assert.deepEqual(beforeSix.seeds, { day: 7, month: 5, zodiac: 1 });
assert.equal(beforeSix.weekday.name, "เสาร์");
assert.equal(beforeSix.lunar.monthNumber, 5);
assert.equal(beforeSix.zodiac.name, "ชวด");

const afterSix = await calculateCalendar({ day: 22, month: 4, yearBe: 2527, time: "08:00" });
assert.equal(afterSix.effectiveDate, "1984-04-22");
assert.deepEqual(afterSix.seeds, { day: 1, month: 5, zodiac: 1 });
assert.equal(afterSix.weekday.name, "อาทิตย์");

const chart = calculateNineBases(7, 5, 1);
assert.deepEqual(chart.bases[0], [7, 1, 2, 3, 4, 5, 6]);
assert.deepEqual(chart.bases[1], [5, 6, 7, 1, 2, 3, 4]);
assert.deepEqual(chart.bases[2], [1, 2, 3, 4, 5, 6, 7]);
assert.deepEqual(chart.bases[3], [13, 9, 12, 8, 11, 14, 17]);
assert.deepEqual(chart.bases[7], [6, 4, 2, 7, 5, 3, 1]);
assert.deepEqual(chart.bases[8], [6, 1, 3, 5, 7, 2, 4]);
assert.deepEqual(chart.base4Names, ["มหาอุจจ์", "พระเกตุ", "พระราหู", "พระอังคาร", "ราชาโชค", "จักรพรรดิ", "พระพุธ"]);

assert.deepEqual(
  calculateAge({ year: 1984, month: 4, day: 22 }, { year: 2026, month: 9, day: 5 }),
  { years: 42, months: 4, days: 14, completed: 42, entering: 43 },
);
assert.deepEqual(
  calculateAge({ year: 2000, month: 2, day: 29 }, { year: 2025, month: 2, day: 28 }),
  { years: 25, months: 0, days: 0, completed: 25, entering: 26 },
);

console.log("✓ Calendar Engine golden tests passed");
console.log("✓ Nine-base Calculation Core tests passed");
console.log("✓ Completed/entering age tests passed");
