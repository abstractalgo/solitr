// Splits a concatenated bundle into its top-level parts.
//
// Usage: node split-bundle.js <bundle.js> <out-dir>
//
// The minifier joined every library into one giant comma expression; this
// turns each element back into its own statement and writes partNNN.js files.
// Prints an index (part number, size, first characters) to identify each one.
const fs = require("fs");
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const t = require("@babel/types");

const [, , inFile, outDir] = process.argv;
const ast = parser.parse(fs.readFileSync(inFile, "utf8"));
const parts = [];
for (const statement of ast.program.body) {
  if (t.isExpressionStatement(statement) && t.isSequenceExpression(statement.expression))
    statement.expression.expressions.forEach((e) => parts.push(t.expressionStatement(e)));
  else parts.push(statement);
}

fs.mkdirSync(outDir, { recursive: true });
parts.forEach((part, i) => {
  const code = generate(part).code;
  fs.writeFileSync(`${outDir}/part${String(i).padStart(3, "0")}.js`, code + "\n");
  console.log(i, code.length, code.slice(0, 100).replace(/\s+/g, " "));
});
