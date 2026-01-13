#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const { execSync } = require("child_process");
const readFileAsync = promisify(fs.readFile);

const DEFAULT_README_PATH = path.join(__dirname, ".github", "README.md");
const README_MARKER_START = "<!-- COUNT-STATS:START -->";
const README_MARKER_END = "<!-- COUNT-STATS:END -->";
const numberFormatter = new Intl.NumberFormat("en-US");

// File extensions to include
const VALID_EXTENSIONS = [
  ".vue",
  ".ts",
  ".tsx",
  ".php",
  ".css",
  ".yml",
  ".yaml",
  ".sql",
  ".cs",
];
// Directories to exclude
const EXCLUDED_DIRS = [
  "node_modules",
  "vendor",
  "cache",
  ".cache",
  "packages",
  "dist",
  "assets",
  ".vite",
  ".vite-cache",
  "addons",
  ".next",
  "out",
  "build",
];
// Process arguments
const targetDir = process.argv[2] || process.cwd();

// Regular expressions for detecting comments
const COMMENT_PATTERNS = {
  ".ts": [/\/\/.*$/m, /\/\*[\s\S]*?\*\//g],
  ".tsx": [/\/\/.*$/m, /\/\*[\s\S]*?\*\//g],
  ".vue": [/<!--[\s\S]*?-->/g, /\/\/.*$/m, /\/\*[\s\S]*?\*\//g],
  ".php": [/\/\/.*$/m, /\/\*[\s\S]*?\*\//g, /#.*$/m],
  ".css": [/\/\*[\s\S]*?\*\//g],
  ".gitignore": [/#.*$/m],
};

// Format number to human readable format (e.g. 1000 -> 1k)
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

function formatInteger(value) {
  return numberFormatter.format(value);
}

function printUsage() {
  console.log(
    [
      "Usage: node count.js [targetDir] [options]",
      "",
      "Options:",
      "  --update-readme          Update the default README with the latest counts (default).",
      "  --readme <path>          Update the specified README file.",
      "  --no-readme              Do not update a README file (overrides other options).",
      "  --use-git                Only count files tracked by git (default).",
      "  --no-git                 Don't use git, traverse filesystem instead.",
      "  --use-gitignore          Use .gitignore patterns when not using git.",
      "  --no-gitignore           Don't use .gitignore patterns.",
      "  -h, --help               Show this help message.",
    ].join("\n")
  );
}

function parseArguments(argv) {
  const args = [...argv];
  let targetDir = process.cwd();
  let readmePath = DEFAULT_README_PATH; // Default to updating README
  let useGit = true; // Default to using git
  let useGitignore = false; // Git handles ignore patterns

  if (args.length > 0 && !args[0].startsWith("-")) {
    targetDir = path.resolve(args.shift());
  } else {
    targetDir = path.resolve(targetDir);
  }

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--readme": {
        const providedPath = args[index + 1];
        if (!providedPath || providedPath.startsWith("-")) {
          throw new Error("Missing path after --readme option.");
        }
        readmePath = path.resolve(providedPath);
        index += 1;
        break;
      }
      case "--update-readme":
        if (!readmePath) {
          readmePath = DEFAULT_README_PATH;
        }
        break;
      case "--no-readme":
        readmePath = null;
        break;
      case "--use-git":
        useGit = true;
        break;
      case "--no-git":
        useGit = false;
        break;
      case "--no-gitignore":
        useGitignore = false;
        break;
      case "--use-gitignore":
        useGitignore = true;
        break;
      case "--help":
      case "-h":
        printUsage();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return {
    targetDir,
    readmePath,
    shouldUpdateReadme: Boolean(readmePath),
    useGit,
    useGitignore,
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildReadmeTable(sortedResults, totalFiles, totalLines) {
  const header = "| Extension | Files | Lines |\n| --- | ---: | ---: |";

  const body =
    sortedResults.length > 0
      ? sortedResults
          .map(([ext, { files, lines }]) => {
            return `| \`${ext}\` | ${formatInteger(files)} | ${formatInteger(
              lines
            )} |`;
          })
          .join("\n")
      : "| _No matching files_ | 0 | 0 |";

  const totalRow = `| **Total** | ${formatInteger(
    totalFiles
  )} | ${formatInteger(totalLines)} |`;

  return [header, body, totalRow].join("\n");
}

function buildReadmeSection(table, timestampIso) {
  return [
    README_MARKER_START,
    "",
    `_Last updated: ${timestampIso}_`,
    "",
    table,
    "",
    README_MARKER_END,
  ].join("\n");
}

function updateReadmeWithResults(
  readmePath,
  sortedResults,
  totalFiles,
  totalLines,
  timestampIso
) {
  if (!fs.existsSync(readmePath)) {
    console.warn(
      `README file not found at ${readmePath}. Skipping README update.`
    );
    return false;
  }

  const readmeContent = fs.readFileSync(readmePath, "utf8");

  if (
    !readmeContent.includes(README_MARKER_START) ||
    !readmeContent.includes(README_MARKER_END)
  ) {
    console.warn(
      `README markers not found in ${readmePath}. Add "${README_MARKER_START}" and "${README_MARKER_END}" to enable automatic updates.`
    );
    return false;
  }

  const sectionPattern = new RegExp(
    `${escapeRegExp(README_MARKER_START)}[\\s\\S]*?${escapeRegExp(
      README_MARKER_END
    )}`
  );

  const table = buildReadmeTable(sortedResults, totalFiles, totalLines);
  const newSection = buildReadmeSection(table, timestampIso);

  const updatedContent = readmeContent.replace(sectionPattern, newSection);

  fs.writeFileSync(readmePath, updatedContent);

  return true;
}

// Parse .gitignore patterns
function parseGitignore(gitignorePath, baseDir) {
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }

  const content = fs.readFileSync(gitignorePath, "utf8");
  const patterns = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Convert pattern to regex
    let pattern = trimmed;
    const isNegation = pattern.startsWith("!");
    if (isNegation) {
      pattern = pattern.substring(1);
    }

    // Handle directory patterns (ending with /)
    const isDirectory = pattern.endsWith("/");
    if (isDirectory) {
      pattern = pattern.slice(0, -1);
    }

    // Convert glob patterns to regex
    let regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*\*/g, ".*")
      .replace(/\*/g, "[^/]*")
      .replace(/\?/g, ".");

    // If pattern doesn't start with /, it matches anywhere
    if (!pattern.startsWith("/")) {
      regexPattern = `.*${regexPattern}`;
    } else {
      regexPattern = regexPattern.substring(1);
    }

    // Add directory match if needed
    if (isDirectory) {
      regexPattern = `${regexPattern}.*`;
    }

    patterns.push({
      pattern: new RegExp(`^${regexPattern}`),
      isNegation,
      baseDir,
    });
  }

  return patterns;
}

// Collect all .gitignore files
function collectGitignoreFiles(dir, gitignoreFiles = [], baseDir = null) {
  if (!baseDir) {
    baseDir = dir;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const gitignorePath = path.join(dir, ".gitignore");

    if (fs.existsSync(gitignorePath)) {
      gitignoreFiles.push(gitignorePath);
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(dir, entry.name);
        // Skip excluded directories
        if (
          EXCLUDED_DIRS.some((excluded) =>
            entry.name.toLowerCase().includes(excluded.toLowerCase())
          )
        ) {
          continue;
        }
        collectGitignoreFiles(fullPath, gitignoreFiles, baseDir);
      }
    }
  } catch (error) {
    // Ignore errors (e.g., permission denied)
  }

  return gitignoreFiles;
}

// Check if a path should be ignored based on .gitignore patterns
function shouldIgnore(filePath, gitignorePatterns, baseDir) {
  const relativePath = path.relative(baseDir, filePath).replace(/\\/g, "/");

  // Check patterns in order (later patterns override earlier ones)
  let ignored = false;
  for (const { pattern, isNegation } of gitignorePatterns) {
    if (pattern.test(relativePath) || pattern.test(`/${relativePath}`)) {
      if (isNegation) {
        ignored = false;
      } else {
        ignored = true;
      }
    }
  }

  return ignored;
}

// Get git-tracked files
function getGitTrackedFiles(targetDir) {
  try {
    const output = execSync("git ls-files", {
      cwd: targetDir,
      encoding: "utf8",
    });
    return new Set(
      output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => path.resolve(targetDir, line))
    );
  } catch (error) {
    return null;
  }
}

async function countLinesInFile(filePath) {
  try {
    let content = await readFileAsync(filePath, "utf8");
    const ext = path.extname(filePath).toLowerCase();

    // Remove comments based on file extension
    if (COMMENT_PATTERNS[ext]) {
      COMMENT_PATTERNS[ext].forEach((pattern) => {
        content = content.replace(pattern, "");
      });
    }

    const lines = content.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    return nonEmptyLines.length;
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error.message}`);
    return 0;
  }
}

async function traverseDirectory(
  dir,
  results = {},
  gitignorePatterns = [],
  baseDir = null,
  gitTrackedFiles = null
) {
  if (!baseDir) {
    baseDir = dir;
  }

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (
          EXCLUDED_DIRS.some((excluded) =>
            entry.name.toLowerCase().includes(excluded.toLowerCase())
          )
        ) {
          continue;
        }

        // Check if directory should be ignored
        if (
          gitignorePatterns.length > 0 &&
          shouldIgnore(fullPath, gitignorePatterns, baseDir)
        ) {
          continue;
        }

        await traverseDirectory(
          fullPath,
          results,
          gitignorePatterns,
          baseDir,
          gitTrackedFiles
        );
      } else if (entry.isFile()) {
        // Skip if using git and file is not tracked
        if (gitTrackedFiles !== null && !gitTrackedFiles.has(fullPath)) {
          continue;
        }

        // Check if file should be ignored
        if (
          gitignorePatterns.length > 0 &&
          shouldIgnore(fullPath, gitignorePatterns, baseDir)
        ) {
          continue;
        }

        const ext = path.extname(entry.name).toLowerCase();

        if (VALID_EXTENSIONS.includes(ext)) {
          const lineCount = await countLinesInFile(fullPath);
          if (!results[ext]) {
            results[ext] = { files: 0, lines: 0 };
          }
          results[ext].files++;
          results[ext].lines += lineCount;
        }
      }
    }
  } catch (error) {
    console.error(`Error traversing directory ${dir}: ${error.message}`);
  }

  return results;
}

async function main() {
  let parsedArgs;

  try {
    parsedArgs = parseArguments(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }

  const {
    targetDir,
    readmePath,
    shouldUpdateReadme,
    useGit,
    useGitignore,
  } = parsedArgs;

  let countings = "";

  countings += `Counting non-empty lines of code in ${targetDir}... \n`;
  countings += `Including extensions: ${VALID_EXTENSIONS.join(", ")} \n`;
  countings += `Excluding directories: ${EXCLUDED_DIRS.join(", ")} \n`;
  countings += "Excluding also comments and empty lines \n";

  // Collect gitignore patterns
  let gitignorePatterns = [];
  let gitTrackedFiles = null;

  if (useGit) {
    countings += "Using git-tracked files only \n";
    gitTrackedFiles = getGitTrackedFiles(targetDir);
    if (!gitTrackedFiles) {
      console.warn("Warning: Not a git repository or git not available. Falling back to file system traversal.");
    }
  } else if (useGitignore) {
    countings += "Respecting .gitignore patterns \n";
    const gitignoreFiles = collectGitignoreFiles(targetDir);
    for (const gitignoreFile of gitignoreFiles) {
      const gitignoreDir = path.dirname(gitignoreFile);
      const patterns = parseGitignore(gitignoreFile, targetDir);
      gitignorePatterns.push(...patterns);
    }
  }

  const results = await traverseDirectory(
    targetDir,
    {},
    gitignorePatterns,
    targetDir,
    gitTrackedFiles
  );

  countings += "\nResults:\n";
  countings += "-".repeat(50) + "\n";

  let totalFiles = 0;
  let totalLines = 0;

  // Sort results by line count in descending order
  const sortedResults = Object.entries(results).sort(
    (a, b) => b[1].lines - a[1].lines
  );

  sortedResults.forEach(([ext, { files, lines }]) => {
    countings += `${ext.padEnd(6)} | ${formatNumber(files).padStart(
      6
    )} files | ${formatNumber(lines).padStart(8)} lines \n`;
    totalFiles += files;
    totalLines += lines;
  });

  countings += "-".repeat(50) + "\n";
  countings += `Total  | ${formatNumber(totalFiles).padStart(
    6
  )} files | ${formatNumber(totalLines).padStart(8)} lines \n`;

  const timestampIso = new Date().toISOString();

  if (shouldUpdateReadme) {
    const readmeUpdated = updateReadmeWithResults(
      readmePath,
      sortedResults,
      totalFiles,
      totalLines,
      timestampIso
    );

    if (readmeUpdated) {
      countings += `README updated at ${readmePath} \n`;
    } else {
      countings += `README update skipped for ${readmePath} \n`;
    }
  }

  // Store results in a JSON file
  const resultsWithTotal = {
    total: {
      files: totalFiles,
      lines: totalLines,
    },
  };

  // Add sorted results to JSON
  sortedResults.forEach(([ext, data]) => {
    resultsWithTotal[ext] = data;
  });

  const resultsDir = path.join(process.cwd(), "count-results");
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir);
  }

  const safeTimestamp = timestampIso.replace(/[:.]/g, "-");

  const resultsFile = path.join(
    resultsDir,
    `count-results-${safeTimestamp}.json`
  );
  const resultsFileRaw = path.join(
    resultsDir,
    `count-results-${safeTimestamp}.txt`
  );

  fs.writeFileSync(resultsFile, JSON.stringify(resultsWithTotal, null, 2));
  fs.writeFileSync(resultsFileRaw, countings);

  console.log(
    countings +
      "\n\n" +
      `Results saved to: \n` +
      resultsFile +
      "\n" +
      resultsFileRaw
  );
}

main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
