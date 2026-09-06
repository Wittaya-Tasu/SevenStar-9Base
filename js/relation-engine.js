import { HOUSE_NAMES } from "./chart-engine.js";

const BAD_HOUSES = [
  { base: 1, house: "หินะ" },
  { base: 2, house: "อริ" },
  { base: 3, house: "มรณะ" },
  { base: 3, house: "พยายะ" },
  { base: 8, house: "อุบาทว์" },
  { base: 8, house: "มหาโจร" },
  { base: 8, house: "ทาสา" },
];

const PAIR_RULES = [
  [1, 5, "มิตรใหญ่", "green-strong"], [1, 19, "มิตรใหญ่", "green-strong"],
  [2, 4, "มิตรใหญ่", "green-strong"], [2, 17, "มิตรใหญ่", "green-strong"],
  [4, 15, "มิตรใหญ่", "green-strong"], [6, 8, "มิตรใหญ่", "green-strong"],
  [7, 12, "มิตรใหญ่", "green-strong"],

  [1, 3, "ศัตรูใหญ่", "red-strong"], [1, 8, "ศัตรูใหญ่", "red-strong"],
  [3, 6, "ศัตรูใหญ่", "red-strong"], [4, 12, "ศัตรูใหญ่", "red-strong"],
  [6, 10, "ศัตรูใหญ่", "red-strong"], [6, 20, "ศัตรูใหญ่", "red-strong"],
  [7, 21, "ศัตรูใหญ่", "red-strong"],

  [1, 6, "กำลังตน", "blue-strong"], [2, 15, "กำลังตน", "blue-strong"],
  [3, 8, "กำลังตน", "blue-strong"], [4, 17, "กำลังตน", "blue-strong"],
  [5, 19, "กำลังตน", "blue-strong"], [7, 10, "กำลังตน", "blue-strong"],
  [7, 20, "กำลังตน", "blue-strong"],

  [1, 7, "ธาตุไฟ", "blue", "notBad"], [1, 10, "ธาตุไฟ", "blue", "notBad"],
  [2, 5, "ธาตุดิน", "blue", "notBad"], [2, 19, "ธาตุดิน", "blue", "notBad"],
  [3, 12, "ธาตุลม", "blue"], [5, 15, "ธาตุดิน", "blue"],
  [6, 17, "ธาตุน้ำ", "blue"],

  [2, 12, "สมพล", "blue-strong"], [3, 5, "สมพล", "blue-strong"],
  [3, 19, "สมพล", "blue-strong"], [4, 7, "สมพล", "blue-strong"],
  [4, 10, "สมพล", "blue-strong"], [5, 8, "สมพล", "blue-strong"],
  [7, 17, "สมพล", "blue-strong"],

  [1, 7, "ศัตรู", "red", "bad"], [1, 10, "ศัตรู", "red", "bad"],
  [1, 12, "ศัตรู", "red"],
  [2, 5, "ศัตรู", "red", "bad"], [2, 19, "ศัตรู", "red", "bad"],
  [2, 7, "ศัตรู", "red"], [2, 10, "ศัตรู", "red"],
  [2, 12, "ศัตรู", "red", "bad"],
  [3, 7, "ศัตรู", "red"], [3, 10, "ศัตรู", "red"], [3, 17, "ศัตรู", "red"],
  [4, 8, "ศัตรู", "red"],
  [5, 7, "ศัตรู", "red"], [5, 10, "ศัตรู", "red"], [5, 12, "ศัตรู", "red"],
  [5, 15, "ศัตรู", "red", "bad"],
  [6, 12, "ศัตรู", "red"],
  [7, 15, "ศัตรู", "red"], [7, 19, "ศัตรู", "red"],

  [1, 15, "กลาง", "black"], [1, 4, "กลาง", "black"], [1, 17, "กลาง", "black"],
  [2, 6, "กลาง", "black"], [2, 8, "กลาง", "black"],
  [3, 15, "กลาง", "black"], [4, 6, "กลาง", "black"],
  [5, 17, "กลาง", "black"], [6, 15, "กลาง", "black"],
].map(([base3, base4, name, style, condition = null]) => ({
  base3, base4, name, style, condition,
}));

function columnOfHouse(base, house) {
  const column = HOUSE_NAMES[base]?.indexOf(house);
  if (column === undefined || column < 0) {
    throw new Error(`ไม่พบตำแหน่ง ${house} ในฐาน ${base}`);
  }
  return column;
}

export function getBadNumbers(chart) {
  return new Set(BAD_HOUSES.map(({ base, house }) => (
    chart.bases[base - 1][columnOfHouse(base, house)]
  )));
}

export function getRelations(base3Number, base4Number, badNumbers) {
  const pairRules = PAIR_RULES.filter((rule) => (
    rule.base3 === Number(base3Number) && rule.base4 === Number(base4Number)
  ));
  const isBad = badNumbers.has(Number(base3Number));
  const selectedPairRules = pairRules.filter(rule => !rule.condition ||
    (rule.condition === "bad" && isBad) || (rule.condition === "notBad" && !isBad));
  return selectedPairRules.map(({ name, style }) => ({ name, style }));
}

export function buildRelationColumns(chart) {
  const badNumbers = getBadNumbers(chart);
  return chart.bases[2].map((base3Number, column) => ({
    column: column + 1,
    base3Number,
    base4Number: chart.bases[3][column],
    relations: getRelations(base3Number, chart.bases[3][column], badNumbers),
  }));
}

export function getLinkedCellKeys(chart, selectedBase, selectedColumn) {
  const base = Number(selectedBase);
  const column = Number(selectedColumn);
  const selectedValue = chart.bases[base - 1][column - 1];
  const equal = new Set();
  const vertical = new Set();
  let valueToRepeat = selectedValue;

  if (base === 4) {
    // ฐาน 4 เป็นผลรวม: เลือกเฉพาะช่องที่คลิก แล้วใช้เลขฐาน 3
    // ในคอลัมน์เดียวกันเป็นเลขสำหรับค้นหาซ้ำทั่วทั้งแผนผัง
    valueToRepeat = chart.bases[2][column - 1];
    vertical.add(`3:${column}`);
    vertical.add(`4:${column}`);
  } else {
    chart.bases[2].forEach((value, columnIndex) => {
      if (value !== selectedValue) return;
      vertical.add(`3:${columnIndex + 1}`);
      vertical.add(`4:${columnIndex + 1}`);
    });
  }

  chart.bases.forEach((values, baseIndex) => {
    values.forEach((value, columnIndex) => {
      if (value === valueToRepeat) equal.add(`${baseIndex + 1}:${columnIndex + 1}`);
    });
  });

  return { equal, vertical, valueToRepeat };
}

export const relationConstants = { BAD_HOUSES, PAIR_RULES };
