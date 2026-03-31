const fs = require('fs');
const path = require('path');
const db = require('./database');

async function run() {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations folder found.');
    process.exit(0);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No .sql migration files found.');
    return;
  }

  for (const file of files) {
    const full = path.join(migrationsDir, file);
    console.log('Running migration:', file);
    const sql = fs.readFileSync(full, 'utf8');
    try {
      await db.run(sql);
      console.log('Applied', file);
    } catch (err) {
      console.error('Failed to apply', file, err.message || err);
      process.exit(1);
    }
  }

  console.log('All migrations applied successfully.');
  process.exit(0);
}

run();
