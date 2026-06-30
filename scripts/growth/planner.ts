import fs from "node:fs";
import path from "node:path";
import { analyzeGrowth } from "./analyze";

const outputPath = path.join(process.cwd(), "data", "growth-plan.json");

function main() {
  const plan = analyzeGrowth();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, outputPath);

  console.log(`Growth plan saved to ${path.relative(process.cwd(), outputPath)}.`);
  console.log(
    `${plan.summary.todaysWork} tasks selected for today from ${plan.tasks.length} actionable opportunities.`
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
