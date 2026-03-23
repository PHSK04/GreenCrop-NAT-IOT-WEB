#!/usr/bin/env node
const { execFileSync } = require("child_process");
const fs = require("fs");

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

function getStagedFiles() {
  const output = tryGit(["diff", "--cached", "--name-only"]);
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function buildMessage() {
  const files = getStagedFiles();
  const fileLabel = files.length > 0 ? files.join(", ") : "no staged files";
  const count = Number(tryGit(["rev-list", "--count", "HEAD"]) || "0");
  const date = formatDate();
  return `update: ${fileLabel} (round ${count}) - ${date}`;
}

function main() {
  const args = process.argv.slice(2);
  const shouldCommit = args.includes("--commit");
  const shouldStageAll = args.includes("--all");
  const targetFile = args.find((arg) => !arg.startsWith("--"));

  if (shouldStageAll) {
    runGit(["add", "-A"]);
  }

  const message = buildMessage();

  if (targetFile) {
    fs.writeFileSync(targetFile, `${message}\n`);
    return;
  }

  if (!shouldCommit) {
    process.stdout.write(`${message}\n`);
    return;
  }

  const staged = getStagedFiles();
  if (staged.length === 0) {
    console.error("No staged changes to commit.");
    process.exit(1);
  }

  runGit(["commit", "-m", message], { stdio: "inherit" });
}

main();
