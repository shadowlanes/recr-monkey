#!/usr/bin/env node

import { runMigrations } from './dist/database.js';

async function main() {
  try {
    console.log('Running database migrations...');
    await runMigrations();
    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();