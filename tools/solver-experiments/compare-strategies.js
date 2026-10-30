// Combines strategies.js results (all *.json under the given directory) into
// markdown tables: share of positions still unresolved at several budgets, for
// each strategy alone and paired with dfs (each gets half the budget, taking
// turns, so the pair resolves a position at 2 × the earlier of the two).
//   node compare-strategies.js <dir>
const fs = require("fs");
const path = require("path");

const dir = process.argv[2];
const byStrategy = {};
for (const f of fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith(".json"))) {
  const { variant, cap, rows } = JSON.parse(fs.readFileSync(path.join(dir, f)));
  const s = (byStrategy[variant] ||= { cap, at: new Map() });
  for (const r of rows) s.at.set(r.i, { ...r, at: r.at === null ? Infinity : r.at });
}
const cap = Math.min(...Object.values(byStrategy).map((s) => s.cap));
const ids = [...byStrategy.dfs.at.keys()];
const fresh = new Set(ids.filter((i) => byStrategy.dfs.at.get(i).fresh));
const budgets = [1500, 5000, 20000, 50000, cap].filter((b, i, a) => b <= cap && a.indexOf(b) === i);
const names = ["dfs", ...Object.keys(byStrategy).filter((s) => s !== "dfs").sort()];

function table(title, atOf) {
  const lines = [
    `### ${title}`,
    "",
    `| Strategy | ${budgets.map((b) => `Unresolved @ ${b.toLocaleString("en")}`).join(" | ")} | Fresh deals unresolved @ ${cap.toLocaleString("en")} | Wins found | Proven lost |`,
    `|---|${budgets.map(() => "---:").join("|")}|---:|---:|---:|`,
  ];
  for (const s of names) {
    const rows = ids.map((i) => atOf(s, i));
    const pct = (list, b) => ((100 * list.filter((r) => r.at > b).length) / list.length).toFixed(1) + "%";
    const freshRows = ids.filter((i) => fresh.has(i)).map((i) => atOf(s, i));
    const within = rows.filter((r) => r.at <= cap);
    lines.push(
      `| ${s} | ${budgets.map((b) => pct(rows, b)).join(" | ")} | ${pct(freshRows, cap)} | ${within.filter((r) => r.result === "winnable").length} | ${within.filter((r) => r.result === "unwinnable").length} |`,
    );
  }
  return lines.join("\n");
}

console.log(`${ids.length} positions (${fresh.size} fresh deals), search cap ${cap.toLocaleString("en")} moves per strategy.\n`);
console.log(table("Alone", (s, i) => byStrategy[s].at.get(i)));
console.log();
console.log(
  table("Paired with dfs (budget split in half)", (s, i) => {
    const a = byStrategy.dfs.at.get(i), b = byStrategy[s].at.get(i);
    if (s === "dfs") return a;
    const first = a.at <= b.at ? a : b;
    return { ...first, at: 2 * first.at };
  }),
);
