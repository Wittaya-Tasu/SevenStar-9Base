import { getLinkedCellKeys } from "./relation-engine.js";

// One selection per star number; clicking its anchor again removes the group.
export function toggleSelection(chart, selections, base, column) {
  base = Number(base); column = Number(column);
  const star = base === 4 ? chart.bases[2][column - 1] : chart.bases[base - 1][column - 1];
  const next = new Map(selections);
  const previous = next.get(star);
  if (previous?.base === base && previous?.column === column) next.delete(star);
  else next.set(star, { base, column });
  return next;
}

export function selectionHighlights(chart, selections) {
  const selected = new Set();
  const related = new Set();
  for (const { base, column } of selections.values()) {
    selected.add(`${base}:${column}`);
    const links = getLinkedCellKeys(chart, base, column);
    for (const key of [...links.equal, ...links.vertical]) related.add(key);
  }
  for (const key of selected) related.delete(key);
  return { selected, related };
}

export function houseAppearance(base, column) {
  const key = `${base}:${column}`;
  if (["8:2", "8:5"].includes(key)) return { color: "#922337", weight: 400, className: "bad-house" };
  if (["1:2", "2:6", "3:1", "3:5", "8:6"].includes(key)) return { color: "#922337", weight: 700, className: "bad-house strong" };
  return { color: "#5d687a", weight: 600, className: "" };
}

// Match by sum so established spelling variants keep the same presentation.
export function isSpecialResult(value) {
  return [9, 11, 12, 13, 14, 16, 18].includes(Number(value));
}
