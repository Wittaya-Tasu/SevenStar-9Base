export const HOUSE_NAMES = {
  1: ["อัตตะ", "หินะ", "ธนัง", "ปิตา", "มาตา", "โภคา", "มัชฌิมา"],
  2: ["ตะนุ", "กดุมภะ", "สหัชชะ", "พันธุ", "ปุตตะ", "อริ", "ปัตนิ"],
  3: ["มรณะ", "สุภะ", "กัมมะ", "ลาภะ", "พยายะ", "ทาสา", "ทาสี"],
  8: ["อาตมา", "ทาสา", "สิทธิโชค", "โภคสมบัติ", "มหาโจร", "อุบาทว์", "อุปถัมภ์"],
  9: ["อัตตะ", "สักกะ", "ญาติ", "ธนัง", "เคหัง", "นาวัง", "ภริยัง"],
};

export const BASE4_NAMES = {
  3: "อังคารเล็ก", 4: "พุธเล็ก", 5: "พฤหัสบดี", 6: "พระอาทิตย์",
  7: "เสาร์เล็ก", 8: "พระอังคาร", 9: "พระเกตุ", 10: "พระเสาร์",
  11: "ราชาโชค", 12: "พระราหู", 13: "มหาอุจจ์", 14: "จักรพรรดิ",
  15: "พระจันทร์", 16: "โสฬสมงคล", 17: "พระพุธ", 18: "มหาจักรพรรดิ",
  19: "พระพฤหัสฯ", 20: "เสาร์กำลัง2", 21: "พระศุกร์",
};

const DAYTIME_YAM = [1, 6, 4, 2, 7, 5, 3];

export function reduceTo1To7(value) {
  return ((Number(value) - 1) % 7 + 7) % 7 + 1;
}

export function sequence1To7(start) {
  return Array.from({ length: 7 }, (_, index) => reduceTo1To7(Number(start) + index));
}

function walkDaytimeYam(start) {
  const index = DAYTIME_YAM.indexOf(Number(start));
  if (index < 0) throw new Error("เลขตั้งต้นยามกลางวันไม่ถูกต้อง");
  return Array.from({ length: 7 }, (_, offset) => DAYTIME_YAM[(index + offset) % 7]);
}

export function calculateNineBases(daySeed, monthSeed, zodiacSeed) {
  const seeds = [daySeed, monthSeed, zodiacSeed].map(Number);
  if (!seeds.every((value) => Number.isInteger(value) && value >= 1 && value <= 7)) {
    throw new Error("เลขตั้งต้นฐาน 1–3 ต้องอยู่ระหว่าง 1–7");
  }
  const base1 = sequence1To7(seeds[0]);
  const base2 = sequence1To7(seeds[1]);
  const base3 = sequence1To7(seeds[2]);
  const base4 = base1.map((value, index) => value + base2[index] + base3[index]);
  const base5 = base4.map(reduceTo1To7);
  const base6 = base5.map((value) => reduceTo1To7(value * 2));
  const base7 = base6.map((value) => reduceTo1To7(value * 2));
  const base8 = walkDaytimeYam(base5[0]);
  const start9 = reduceTo1To7(base5[6] + base8[6]);
  const base9 = walkDaytimeYam(start9).reverse();
  return {
    seeds: { day: seeds[0], month: seeds[1], zodiac: seeds[2] },
    bases: [base1, base2, base3, base4, base5, base6, base7, base8, base9],
    base4Names: base4.map((value) => BASE4_NAMES[value]),
  };
}
