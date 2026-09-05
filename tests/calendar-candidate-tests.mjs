import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/thai-lunar-engine.js", import.meta.url), "utf8");
const sandbox = { module: { exports: {} }, exports: {} };
vm.runInNewContext(source, sandbox, { filename: "thai-lunar-engine.js" });
const { thaiSolarToLunar, thaiBirthDateTimeToLunar } = sandbox.module.exports;

const monthFiveBoundary = thaiSolarToLunar(1, 4, 2527);
assert.equal(monthFiveBoundary.lunar.phase, "ขึ้น");
assert.equal(monthFiveBoundary.lunar.dayOfPhase, 1);
assert.equal(monthFiveBoundary.lunar.month.number, 5);
assert.equal(monthFiveBoundary.lunar.month.name, "เดือนห้า");
assert.equal(monthFiveBoundary.lunar.yearAnimal, "ชวด");
assert.equal(monthFiveBoundary.lunar.chulaSakaratYear, 1345);
assert.equal(monthFiveBoundary.lunar.naksatrChulaSakaratYear, 1346);

const beforeSix = thaiBirthDateTimeToLunar(22, 4, 2527, "01:49");
assert.deepEqual(
  { ...beforeSix.effectiveInput },
  { day: 21, month: 4, beYear: 2527 },
);
assert.equal(beforeSix.weekday, "วันเสาร์");
assert.equal(beforeSix.lunar.month.number, 5);
assert.equal(beforeSix.lunar.yearAnimal, "ชวด");
assert.deepEqual({ ...beforeSix.seeds }, { day: 7, month: 5, zodiac: 1 });

const afterSix = thaiBirthDateTimeToLunar(22, 4, 2527, "08:00");
assert.deepEqual(
  { ...afterSix.effectiveInput },
  { day: 22, month: 4, beYear: 2527 },
);
assert.equal(afterSix.weekday, "วันอาทิตย์");
assert.deepEqual({ ...afterSix.seeds }, { day: 1, month: 5, zodiac: 1 });

const leapEight = thaiSolarToLunar(2, 8, 2569);
assert.equal(leapEight.lunar.month.number, 8);
assert.equal(leapEight.lunar.month.displayCode, 88);
assert.equal(leapEight.lunar.month.isLeapSecondEight, true);

assert.throws(() => thaiBirthDateTimeToLunar(31, 4, 2569, "08:00"), /ไม่ใช่วันที่/);
assert.throws(() => thaiBirthDateTimeToLunar(22, 4, 2527, "24:00"), /เวลาเกิดไม่ถูกต้อง/);

// Regression: ตรวจทุกวันในช่วงใช้งานเดียวกับ Dataset ของ Active Engine
let checkedDays = 0;
let invalidMonthResults = 0;
for (let year = 1926; year <= 2126; year += 1) {
  const cursor = new Date(Date.UTC(year, 0, 1));
  const end = new Date(Date.UTC(year, 11, 31));
  while (cursor <= end) {
    const result = thaiSolarToLunar(
      cursor.getUTCDate(),
      cursor.getUTCMonth() + 1,
      year + 543,
    );
    checkedDays += 1;
    if (
      !result.lunar.month.name ||
      result.lunar.month.number < 1 ||
      result.lunar.month.number > 12
    ) {
      invalidMonthResults += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
}
assert.equal(checkedDays, 73414);
assert.equal(invalidMonthResults, 0);

console.log("✓ Corrected Calendar Engine boundary tests passed");
console.log("✓ Corrected Calendar Engine 06:00 cutoff tests passed");
console.log("✓ Corrected Calendar Engine leap-month tests passed");
console.log("✓ Corrected Calendar Engine checked 73,414 days with no invalid month");
