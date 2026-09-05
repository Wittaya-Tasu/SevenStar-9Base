const WEEKDAY_NAMES = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const ZODIAC_NAMES = ["ชวด", "ฉลู", "ขาล", "เถาะ", "มะโรง", "มะเส็ง", "มะเมีย", "มะแม", "วอก", "ระกา", "จอ", "กุน"];
const THAI_MONTH_NAMES = {
  1: "เดือนอ้าย", 2: "เดือนยี่", 3: "เดือนสาม", 4: "เดือนสี่",
  5: "เดือนห้า", 6: "เดือนหก", 7: "เดือนเจ็ด", 8: "เดือนแปดแรก",
  88: "เดือนแปดหลัง", 9: "เดือนเก้า", 10: "เดือนสิบ",
  11: "เดือนสิบเอ็ด", 12: "เดือนสิบสอง",
};

let cachedDataset;

export async function loadCalendarDataset(url = "./data/lunar-month-boundaries.json") {
  if (cachedDataset) return cachedDataset;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`โหลดข้อมูลปฏิทินไม่สำเร็จ (${response.status})`);
  const payload = await response.json();
  if (!Array.isArray(payload.boundaries) || payload.boundaries.length < 2) {
    throw new Error("รูปแบบข้อมูลปฏิทินไม่ถูกต้อง");
  }
  cachedDataset = payload;
  return payload;
}

export function setCalendarDatasetForTests(payload) {
  cachedDataset = payload;
}

function positiveMod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function reduceTo1To7(value) {
  return positiveMod(Number(value) - 1, 7) + 1;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function isoDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${pad(month)}-${pad(day)}`;
}

function parseIso(value) {
  const [year, month, day] = value.split("-").map(Number);
  return { year, month, day };
}

function utcDate(parts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function compareIso(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

function addDays(iso, amount) {
  const date = utcDate(parseIso(iso));
  date.setUTCDate(date.getUTCDate() + amount);
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function daysBetween(startIso, endIso) {
  return Math.round((utcDate(parseIso(endIso)) - utcDate(parseIso(startIso))) / 86400000);
}

function daysInGregorianMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function validateBirthInput(input) {
  const day = Number(input.day);
  const month = Number(input.month);
  const yearBe = Number(input.yearBe);
  const yearCe = yearBe - 543;
  if (!Number.isInteger(yearCe) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new Error("กรุณากรอกวัน เดือน และปี พ.ศ. ให้ครบ");
  }
  if (month < 1 || month > 12 || day < 1 || day > daysInGregorianMonth(yearCe, month)) {
    throw new Error("วันเดือนปีเกิดไม่มีอยู่จริง");
  }
  if (!/^\d{2}:\d{2}$/.test(input.time || "")) throw new Error("กรุณาระบุเวลาเกิด");
  const [hour, minute] = input.time.split(":").map(Number);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) throw new Error("เวลาเกิดไม่ถูกต้อง");
  return { day, month, yearBe, yearCe, hour, minute };
}

function findBoundaryIndex(boundaries, targetIso) {
  let low = 0;
  let high = boundaries.length - 1;
  let answer = -1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    if (boundaries[middle].d <= targetIso) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return answer;
}

function resolveLunarDate(boundaries, effectiveIso) {
  const index = findBoundaryIndex(boundaries, effectiveIso);
  if (index < 0 || index >= boundaries.length - 1) throw new Error("วันที่อยู่นอกช่วงข้อมูลปฏิทิน");
  const boundary = boundaries[index];
  const nextBoundary = boundaries[index + 1];
  const ordinal = daysBetween(boundary.d, effectiveIso) + 1;
  const monthLength = daysBetween(boundary.d, nextBoundary.d);
  if (ordinal < 1 || ordinal > monthLength) throw new Error("ข้อมูลวันจันทรคติไม่สอดคล้องกัน");
  const phase = ordinal <= 15 ? "ขึ้น" : "แรม";
  const lunarDay = ordinal <= 15 ? ordinal : ordinal - 15;
  const yearType = boundary.yt === 384 ? "อธิกมาส" : boundary.yt === 355 ? "อธิกวาร" : "ปกติ";
  return {
    phase,
    lunarDay,
    monthCode: boundary.m,
    monthNumber: boundary.m === 88 ? 8 : boundary.m,
    monthName: THAI_MONTH_NAMES[boundary.m],
    monthLength,
    chulasakarat: boundary.cs,
    yearType,
    boundaryDate: boundary.d,
  };
}

function resolveZodiac(boundaries, effectiveIso) {
  const { year } = parseIso(effectiveIso);
  const boundary = boundaries.find((item) => item.m === 5 && item.d.startsWith(`${year}-`));
  if (!boundary) throw new Error(`ไม่พบวันขึ้น 1 ค่ำ เดือน 5 ของปี ค.ศ. ${year}`);
  const cycleYear = compareIso(effectiveIso, boundary.d) >= 0 ? year : year - 1;
  const index = positiveMod(cycleYear - 1984, 12);
  const seedNumbers = [1, 2, 3, 4, 5, 6, 7, 1, 2, 3, 4, 5];
  return {
    name: ZODIAC_NAMES[index],
    index,
    seed: seedNumbers[index],
    cycleYear,
    month5Boundary: boundary.d,
  };
}

function safeAnniversary(year, month, day) {
  return { year, month, day: Math.min(day, daysInGregorianMonth(year, month)) };
}

function compareParts(a, b) {
  return compareIso(isoDate(a.year, a.month, a.day), isoDate(b.year, b.month, b.day));
}

export function calculateAge(birthParts, asOfParts) {
  if (compareParts(asOfParts, birthParts) < 0) throw new Error("วันที่พิจารณาต้องไม่อยู่ก่อนวันเกิด");
  let years = asOfParts.year - birthParts.year;
  let cursor = safeAnniversary(birthParts.year + years, birthParts.month, birthParts.day);
  if (compareParts(asOfParts, cursor) < 0) {
    years -= 1;
    cursor = safeAnniversary(birthParts.year + years, birthParts.month, birthParts.day);
  }
  let months = 0;
  while (months < 11) {
    let nextMonth = cursor.month + 1;
    let nextYear = cursor.year;
    if (nextMonth > 12) { nextMonth = 1; nextYear += 1; }
    const next = safeAnniversary(nextYear, nextMonth, birthParts.day);
    if (compareParts(next, asOfParts) > 0) break;
    cursor = next;
    months += 1;
  }
  const days = daysBetween(isoDate(cursor.year, cursor.month, cursor.day), isoDate(asOfParts.year, asOfParts.month, asOfParts.day));
  return { years, months, days, completed: years, entering: years + 1 };
}

export async function calculateCalendar(input, datasetUrl) {
  const validated = validateBirthInput(input);
  const dataset = await loadCalendarDataset(datasetUrl);
  const civilIso = isoDate(validated.yearCe, validated.month, validated.day);
  const shifted = validated.hour < 6;
  const effectiveIso = shifted ? addDays(civilIso, -1) : civilIso;
  const effectiveParts = parseIso(effectiveIso);
  const weekdayIndex = utcDate(effectiveParts).getUTCDay();
  const lunar = resolveLunarDate(dataset.boundaries, effectiveIso);
  const zodiac = resolveZodiac(dataset.boundaries, effectiveIso);
  return {
    input: { ...validated, time: input.time },
    civilDate: civilIso,
    effectiveDate: effectiveIso,
    shifted,
    weekday: { index: weekdayIndex, name: WEEKDAY_NAMES[weekdayIndex], seed: weekdayIndex + 1 },
    lunar,
    zodiac,
    seeds: {
      day: weekdayIndex + 1,
      month: reduceTo1To7(lunar.monthNumber),
      zodiac: zodiac.seed,
    },
    metadata: {
      timezone: "Asia/Bangkok",
      calendarEngineVersion: "1.0.0-test",
      lunarDatasetVersion: dataset.version,
    },
  };
}

export const calendarConstants = { WEEKDAY_NAMES, ZODIAC_NAMES, THAI_MONTH_NAMES };
