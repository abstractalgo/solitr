// Combines ordering.js results (all *.json under the given directory) into a
// markdown table: share of positions still unresolved at several budgets.
//   node compare.js <dir>
const fs = require("fs");
const path = require("path");

const dir = process.argv[2];
const byVariant = {};
for (const f of fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".json"))) {
  const { variant, cap, rows } = JSON.parse(fs.readFileSync(path.join(dir, f)));
  (byVariant[variant] ||= { cap, rows: [] }).rows.push(...rows);
}

const cap = Math.min(...Object.values(byVariant).map((v) => v.cap));
const budgets = [1500, 5000, 20000, 50000, cap].filter((b, i, a) => b <= cap && a.indexOf(b) === i);
const lines = [
  `| Variant | ${budgets.map((b) => `Unresolved @ ${b.toLocaleString("en")}`).join(" | ")} | Fresh deals unresolved @ ${cap.toLocaleString("en")} | Wins found | Proven lost |`,
  `|---|${budgets.map(() => "---:").join("|")}|---:|---:|---:|`,
];
const order = ["base", ...Object.keys(byVariant).filter((v) => v !== "base").sort()];
for (const v of order.filter((v) => byVariant[v])) {
  const rows = byVariant[v].rows.map((r) => ({ ...r, at: r.at === null ? Infinity : r.at }));
  const pct = (list, b) => ((100 * list.filter((r) => r.at > b).length) / list.length).toFixed(1) + "%";
  const fresh = rows.filter((r) => r.fresh);
  lines.push(
    `| ${v} | ${budgets.map((b) => pct(rows, b)).join(" | ")} | ${pct(fresh, cap)} | ${rows.filter((r) => r.result === "winnable").length} | ${rows.filter((r) => r.result === "unwinnable").length} |`,
  );
}
const n = Object.values(byVariant)[0].rows.length;
console.log(`${n} positions per variant (${Object.values(byVariant)[0].rows.filter((r) => r.fresh).length} fresh deals), search cap ${cap.toLocaleString("en")} moves.\n`);
console.log(lines.join("\n"));
