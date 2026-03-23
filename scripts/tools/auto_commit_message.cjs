#!/usr/bin/env node
const { execFileSync } = require("child_process");

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

function tryGit(args) {
  try {
    return runGit(args);
  } catch {
    return "";
  }
}

function getChangedFiles() {
  const staged = tryGit(["diff", "--cached", "--name-only"]);
  const unstaged = tryGit(["diff", "--name-only"]);
  const untracked = tryGit(["ls-files", "--others", "--exclude-standard"]);

  const files = new Set(
    [staged, unstaged, untracked]
      .flatMap((chunk) => chunk.split("\n"))
      .map((line) => line.trim())
      .filter(Boolean),
  );

  return [...files];
}

function toLocalTimestamp(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return {
    dayKey: `${year}-${month}-${day}`,
    timeKey: `${hours}:${minutes}`,
  };
}

function inferSummary(files) {
  if (files.length === 1) {
    return `update ${files[0].split("/").pop()}`;
  }

  const buckets = [];
  files.forEach((file) => {
    const parts = file.split("/").filter(Boolean);
    if (parts.length >= 2) {
      buckets.push(parts[0] === "src" ? parts[1] : parts[0]);
      return;
    }
    buckets.push(parts[0] || "project");
  });

  const counts = new Map();
  buckets.forEach((bucket) => {
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  });

  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);

  if (sorted.length === 0) {
    return "update project files";
  }
  if (sorted.length === 1) {
    return `update ${sorted[0]} files`;
  }
  if (sorted.length === 2) {
    return `update ${sorted[0]} and ${sorted[1]} files`;
  }
  return `update ${sorted[0]}, ${sorted[1]}, and other files`;
}

function getNextRound(dayKey) {
  const log = tryGit(["log", "--since", `${dayKey} 00:00`, "--until", `${dayKey} 23:59`, "--format=%s"]);
  if (!log) return 1;

  const rounds = log
    .split("\n")
    .map((line) => {
      const match = line.match(/^round\s+(\d+)\s+-\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+-/i);
      return match ? Number(match[1]) : 0;
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  return (rounds.length ? Math.max(...rounds) : 0) + 1;
}

function buildMessage() {
  const files = getChangedFiles();
  const { dayKey, timeKey } = toLocalTimestamp();
  const round = getNextRound(dayKey);
  const summary = inferSummary(files);
  return `round ${round} - ${dayKey} ${timeKey} - ${summary}`;
}

function main() {
  const args = process.argv.slice(2);
  const shouldCommit = args.includes("--commit");
  const shouldStageAll = args.includes("--all");
  const message = buildMessage();

  if (!shouldCommit) {
    process.stdout.write(`${message}\n`);
    return;
  }

  if (shouldStageAll) {
    runGit(["add", "-A"]);
  }

  const staged = tryGit(["diff", "--cached", "--name-only"]);
  if (!staged) {
    console.error("No staged changes to commit.");
    process.exit(1);
  }

  runGit(["commit", "-m", message], { stdio: "inherit" });
}

main();
