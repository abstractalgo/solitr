// Restores original identifier names in a minified bundle.
//
// Usage: node unminify.js <minified.js> <source-map.map> <out.js>
//
// solitr.com serves a source map without `sourcesContent`, but it still
// carries the `names` table and exact mappings. For every binding (variable,
// function, parameter) we look up the source-map name recorded at its
// declaration (or, failing that, at one of its references) and rename the
// binding via Babel's scope tracker, so shadowing stays correct.
const fs = require("fs");
const { SourceMapConsumer } = require("source-map");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const generate = require("@babel/generator").default;

(async () => {
  const [, , inFile, mapFile, outFile] = process.argv;
  const code = fs.readFileSync(inFile, "utf8");
  const map = JSON.parse(fs.readFileSync(mapFile, "utf8"));

  const names = new Map();
  await SourceMapConsumer.with(map, null, (consumer) =>
    consumer.eachMapping((m) => {
      if (m.name) names.set(m.generatedLine + ":" + m.generatedColumn, m.name);
    }),
  );
  const nameAt = (node) =>
    node.loc && names.get(node.loc.start.line + ":" + node.loc.start.column);

  const ast = parser.parse(code, { sourceType: "script" });
  const plans = [];
  let unmapped = 0;
  traverse(ast, {
    Scope(path) {
      for (const [name, binding] of Object.entries(path.scope.bindings)) {
        if (binding.__seen) continue;
        binding.__seen = true;
        let orig = nameAt(binding.identifier);
        for (const ref of binding.referencePaths) {
          if (orig) break;
          orig = nameAt(ref.node);
        }
        if (!orig) unmapped++;
        else if (orig !== name && /^[A-Za-z_$][\w$]*$/.test(orig))
          plans.push({ binding, orig });
      }
    },
  });

  // Pass 1: move everything to unique temporary names so pass 2 never
  // collides with a not-yet-renamed minified name.
  plans.forEach((p, i) => {
    p.tmp = "__tmp" + i + "__";
    p.binding.scope.rename(p.binding.identifier.name, p.tmp);
  });
  // Pass 2: original names. Prefix with "_" if a *different* binding with
  // that name is visible from this scope.
  for (const p of plans) {
    const scope = p.binding.scope;
    let name = p.orig;
    while (scope.hasBinding(name) && scope.getBinding(name) !== scope.getBinding(p.tmp))
      name = "_" + name;
    scope.rename(p.tmp, name);
  }

  fs.writeFileSync(outFile, generate(ast, { comments: true }).code);
  console.error(`renamed ${plans.length} bindings, ${unmapped} without a mapped name`);
})();
