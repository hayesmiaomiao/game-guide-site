const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const keywordsDirectory = path.join(projectRoot, "content", "keywords");
const guidesDirectory = path.join(projectRoot, "content", "guides");
const requiredColumns = ["keyword", "category", "difficulty", "status", "priority"];

let interrupted = false;

function handleInterrupt(signal) {
  if (!interrupted) {
    console.log(`\nReceived ${signal}. Finishing the current row safely...`);
  }
  interrupted = true;
  process.exitCode = 130;
}

process.on("SIGINT", () => handleInterrupt("SIGINT"));
process.on("SIGTERM", () => handleInterrupt("SIGTERM"));

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function gameNameFromFilename(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function parseCsv(source) {
  const records = [];
  let record = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];

    if (quoted) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      record.push(field);
      field = "";
    } else if (character === "\n") {
      record.push(field.replace(/\r$/, ""));
      records.push(record);
      record = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (quoted) {
    throw new Error("CSV contains an unclosed quoted field.");
  }

  if (field.length || record.length) {
    record.push(field.replace(/\r$/, ""));
    records.push(record);
  }

  return records.filter((row) => row.some((value) => value.trim() !== ""));
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function serializeCsv(headers, rows) {
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

function readCsvFile(filePath) {
  const records = parseCsv(fs.readFileSync(filePath, "utf8"));
  if (!records.length) {
    throw new Error(`${path.relative(projectRoot, filePath)} is empty.`);
  }

  const headers = records[0].map((header) => header.trim());
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(
      `${path.relative(projectRoot, filePath)} is missing columns: ${missingColumns.join(", ")}`
    );
  }

  const rows = records.slice(1).map((values) => {
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });

  return {
    filePath,
    game: gameNameFromFilename(filePath),
    headers,
    rows
  };
}

function saveCsvFile(csvFile) {
  const temporaryPath = `${csvFile.filePath}.tmp`;
  fs.writeFileSync(temporaryPath, serializeCsv(csvFile.headers, csvFile.rows), "utf8");
  fs.renameSync(temporaryPath, csvFile.filePath);
}

function expectedGuidePath(game, keyword) {
  const slug = `${slugify(game)}-${slugify(keyword)}`;
  return path.join(guidesDirectory, `${slug}.mdx`);
}

function runGenerator(task) {
  const nodeCommand = process.execPath;
  return spawnSync(
    nodeCommand,
    [
      "./node_modules/tsx/dist/cli.mjs",
      "scripts/ai/generate-guide-offline.ts",
      "--game",
      task.csvFile.game,
      "--keyword",
      task.row.keyword,
      "--category",
      task.row.category,
      "--difficulty",
      task.row.difficulty
    ],
    {
      cwd: projectRoot,
      stdio: "inherit",
      shell: false
    }
  );
}

function main() {
  try {
    if (!fs.existsSync(keywordsDirectory)) {
      console.log("No content/keywords directory found. Nothing to process.");
      return;
    }

    const csvPaths = fs
      .readdirSync(keywordsDirectory)
      .filter((file) => file.toLowerCase().endsWith(".csv"))
      .map((file) => path.join(keywordsDirectory, file))
      .sort((left, right) => left.localeCompare(right));

    if (!csvPaths.length) {
      console.log("No CSV files found under content/keywords. Nothing to process.");
      return;
    }

    const csvFiles = csvPaths.map(readCsvFile);
    const tasks = csvFiles
      .flatMap((csvFile) =>
        csvFile.rows.map((row, rowIndex) => ({
          csvFile,
          row,
          rowIndex,
          priority: Number.parseInt(row.priority, 10)
        }))
      )
      .filter((task) => task.row.status.trim().toLowerCase() === "todo")
      .sort((left, right) => {
        const leftPriority = Number.isFinite(left.priority) ? left.priority : Number.MAX_SAFE_INTEGER;
        const rightPriority = Number.isFinite(right.priority) ? right.priority : Number.MAX_SAFE_INTEGER;
        return (
          leftPriority - rightPriority ||
          left.csvFile.filePath.localeCompare(right.csvFile.filePath) ||
          left.rowIndex - right.rowIndex
        );
      });

    if (!tasks.length) {
      console.log("No rows with status \"todo\" found.");
      return;
    }

    for (let index = 0; index < tasks.length; index += 1) {
      if (interrupted) break;

      const task = tasks[index];
      const progress = `[${index + 1}/${tasks.length}]`;
      console.log(`${progress} Generating...`);

      const guidePath = expectedGuidePath(task.csvFile.game, task.row.keyword);
      if (fs.existsSync(guidePath)) {
        console.error(
          `${progress} Failed. Guide already exists: ${path.relative(projectRoot, guidePath)}`
        );
        task.row.status = "failed";
        saveCsvFile(task.csvFile);
        continue;
      }

      const result = runGenerator(task);
      const succeeded = !result.error && result.status === 0 && !result.signal;
      task.row.status = succeeded ? "generated" : "failed";
      saveCsvFile(task.csvFile);

      if (succeeded) {
        console.log(`${progress} Done.`);
      } else {
        const reason =
          result.error?.message ||
          (result.signal ? `terminated by ${result.signal}` : `exit code ${result.status}`);
        console.error(`${progress} Failed: ${reason}`);
      }

      if (interrupted) break;
    }

    if (interrupted) {
      console.log("Batch generation stopped safely. Completed row statuses were saved.");
    }
  } catch (error) {
    console.error(
      `Batch generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
  }
}

main();
