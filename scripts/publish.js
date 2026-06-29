const { spawnSync } = require("child_process");

const steps = [
  "batch",
  "toc",
  "internal-links",
  "faq",
  "covers",
  "content:check",
  "build"
];

function runStep(step) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error(
      "npm_execpath is unavailable. Run this pipeline through npm run publish."
    );
  }

  console.log(`\n=== Running: npm run ${step} ===\n`);

  const result = spawnSync(process.execPath, [npmCli, "run", step], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false
  });

  if (result.error) {
    throw new Error(`npm run ${step} could not start: ${result.error.message}`);
  }

  if (result.signal) {
    throw new Error(`npm run ${step} was terminated by ${result.signal}.`);
  }

  if (result.status !== 0) {
    throw new Error(`npm run ${step} exited with code ${result.status}.`);
  }

  console.log(`\n=== Completed: npm run ${step} ===`);
}

function main() {
  for (const step of steps) {
    try {
      runStep(step);
    } catch (error) {
      console.error(`\nPublish pipeline stopped at "${step}".`);
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
      return;
    }
  }

  console.log("\nPublish pipeline completed successfully.");
}

main();
