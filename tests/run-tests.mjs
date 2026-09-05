import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { calculateAge, calculateCalendar, setCalendarDatasetForTests } from "../js/calendar-engine.js";
import { calculateNineBases } from "../js/chart-engine.js";
import {
  buildRelationColumns,
  getBadNumbers,
  getLinkedCellKeys,
  getRelations,
} from "../js/relation-engine.js";

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

assert.deepEqual([...getBadNumbers(chart)].sort((a, b) => a - b), [1, 3, 4, 5]);
assert.deepEqual(
  buildRelationColumns(chart).map((item) => item.relations),
  [
    [],
    [],
    [{ name: "ธาตุลม", style: "blue" }],
    [{ name: "ศัตรู", style: "red" }],
    [],
    [],
    [{ name: "สมพล", style: "blue-strong" }],
  ],
);
assert.deepEqual(getRelations(1, 7, new Set()), [{ name: "ธาตุไฟ", style: "blue" }]);
assert.deepEqual(getRelations(1, 7, new Set([1])), [{ name: "ศัตรู", style: "red" }]);
assert.deepEqual(getRelations(2, 12, new Set([2])), [{ name: "ศัตรู", style: "red" }]);

const verticalExample = calculateNineBases(1, 5, 7);
assert.equal(verticalExample.bases[2][0], 7);
assert.equal(verticalExample.bases[3][0], 13);
assert.equal(getLinkedCellKeys(verticalExample, 3, 1).vertical.has("4:1"), true);
assert.equal(getLinkedCellKeys(verticalExample, 4, 1).vertical.has("3:1"), true);

const reverseHighlightExample = calculateNineBases(1, 1, 1);
const reverseLinks = getLinkedCellKeys(reverseHighlightExample, 4, 1);
assert.equal(reverseLinks.vertical.has("3:1"), true);
assert.equal(reverseLinks.equal.has("1:3"), true);

const screenshotChart = calculateNineBases(5, 5, 3);
assert.equal(screenshotChart.bases[2][3], 6);
assert.equal(screenshotChart.bases[3][3], 8);
const screenshotLinks = getLinkedCellKeys(screenshotChart, 4, 4);
assert.deepEqual([...screenshotLinks.linkedValues].sort((a, b) => a - b), [6, 8]);
for (const key of ["1:2", "2:2", "3:4", "4:4", "5:1", "6:7", "7:3", "8:1", "9:1"]) {
  assert.equal(screenshotLinks.equal.has(key), true, `ต้องไฮไลท์ ${key} เมื่อคลิกเลข 8 ฐาน 4`);
}

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
console.log("✓ Base 3–4 relation and bad-house tests passed");
console.log("✓ Completed/entering age tests passed");
