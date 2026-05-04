const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

require.extensions[".ts"] = function compileTypescript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      skipLibCheck: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const { createEcommerceIntentScenarios } = require("../tests/chatbot/ecommerceIntentScenarioFactory.ts");

const root = process.cwd();
const outDir = path.join(root, "tests", "chatbot", "fixtures", "generated", "ecommerce-intent");
const outPath = path.join(outDir, "chatbot_ecommerce_intent_scenarios.json");

fs.mkdirSync(outDir, { recursive: true });

const scenarios = createEcommerceIntentScenarios();
fs.writeFileSync(
  outPath,
  `${JSON.stringify({
    schemaVersion: 1,
    count: scenarios.length,
    scenarios,
  }, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote ${scenarios.length} ecommerce intent scenarios to ${outPath}`);
