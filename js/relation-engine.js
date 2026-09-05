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
  [1, 15, "neutral-circle"], [1, 3, "enemy-triangle"], [1, 8, "enemy-triangle"],
  [1, 4, "neutral-circle"], [1, 17, "neutral-circle"], [1, 5, "friend-triangle"],
  [1, 19, "friend-triangle"], [1, 6, "double-chevron"],
  [1, 7, "blue-plus", "notBad"], [1, 10, "blue-plus", "notBad"],
  [1, 7, "enemy-circle", "bad"], [1, 10, "enemy-circle", "bad"],
  [1, 12, "enemy-circle"],
  [2, 4, "friend-triangle"], [2, 17, "friend-triangle"],
  [2, 5, "blue-plus", "notBad"], [2, 19, "blue-plus", "notBad"],
  [2, 5, "enemy-circle", "bad"], [2, 19, "enemy-circle", "bad"],
  [2, 15, "double-chevron"], [2, 6, "neutral-circle"],
  [2, 7, "enemy-circle"], [2, 10, "enemy-circle"], [2, 8, "neutral-circle"],
  [2, 12, "double-plus"], [2, 12, "enemy-circle", "bad"],
  [3, 5, "double-plus"], [3, 19, "double-plus"], [3, 6, "enemy-triangle"],
  [3, 7, "enemy-circle"], [3, 10, "enemy-circle"], [3, 8, "double-chevron"],
  [3, 12, "blue-plus"], [3, 15, "neutral-circle"], [3, 17, "enemy-circle"],
  [4, 6, "neutral-circle"], [4, 7, "double-plus"], [4, 10, "double-plus"],
  [4, 8, "enemy-circle"], [4, 12, "enemy-triangle"], [4, 15, "friend-triangle"],
  [4, 17, "double-chevron"],
  [5, 7, "enemy-circle"], [5, 10, "enemy-circle"], [5, 8, "double-plus"],
  [5, 12, "enemy-circle"], [5, 15, "blue-plus"], [5, 15, "enemy-circle", "bad"],
  [5, 17, "neutral-circle"], [5, 19, "double-chevron"],
  [6, 8, "friend-triangle"], [6, 10, "enemy-triangle"], [6, 20, "enemy-triangle"],
  [6, 12, "enemy-circle"], [6, 15, "neutral-circle"], [6, 17, "blue-plus"],
  [7, 10, "double-chevron"], [7, 20, "double-chevron"], [7, 12, "friend-triangle"],
  [7, 15, "enemy-circle"], [7, 17, "double-plus"], [7, 19, "enemy-circle"],
  [7, 21, "enemy-triangle"],
].map(([base3, base4, symbol, condition = null]) => ({ base3, base4, symbol, condition }));

const SPECIAL_BASE4_RULES = {
  9: "star-gold",
  11: "star-gold",
  12: "star-red",
  13: "star-white",
  14: "star-gold",
  16: "star-gold",
  18: "star-gold",
};

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

export function getRelationSymbols(base3Number, base4Number, badNumbers) {
  const pairRules = PAIR_RULES.filter((rule) => (
    rule.base3 === Number(base3Number) && rule.base4 === Number(base4Number)
  ));
  const isBad = badNumbers.has(Number(base3Number));
  const conditional = pairRules.filter((rule) => (
    (rule.condition === "bad" && isBad) ||
    (rule.condition === "notBad" && !isBad)
  ));
  const selectedPairRules = conditional.length
    ? conditional
    : pairRules.filter((rule) => !rule.condition);
  const symbols = selectedPairRules.map((rule) => rule.symbol);
  const special = SPECIAL_BASE4_RULES[Number(base4Number)];
  if (special) symbols.push(special);
  return [...new Set(symbols)];
}

export function buildRelationColumns(chart) {
  const badNumbers = getBadNumbers(chart);
  return chart.bases[2].map((base3Number, column) => ({
    column: column + 1,
    base3Number,
    base4Number: chart.bases[3][column],
    symbols: getRelationSymbols(base3Number, chart.bases[3][column], badNumbers),
  }));
}

export function getLinkedCellKeys(chart, selectedBase, selectedColumn) {
  const base = Number(selectedBase);
  const column = Number(selectedColumn);
  const selectedValue = chart.bases[base - 1][column - 1];
  const equal = new Set();
  const vertical = new Set();

  chart.bases.forEach((values, baseIndex) => {
    values.forEach((value, columnIndex) => {
      if (value === selectedValue) equal.add(`${baseIndex + 1}:${columnIndex + 1}`);
    });
  });

  chart.bases[2].forEach((value, columnIndex) => {
    if (value === selectedValue) vertical.add(`4:${columnIndex + 1}`);
  });
  if (base === 4) vertical.add(`3:${column}`);

  return { equal, vertical };
}

export const relationConstants = { BAD_HOUSES, PAIR_RULES, SPECIAL_BASE4_RULES };
