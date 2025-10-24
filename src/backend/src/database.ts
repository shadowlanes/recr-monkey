import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'recr_monkey_db',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'password',
};

const pool = new Pool(dbConfig);

// Migration tracking table
const createMigrationsTable = `
  CREATE TABLE IF NOT EXISTS migrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );
`;

async function runMigrations() {
  const client = await pool.connect();

  try {
    console.log('Starting database migrations...');

    // Create migrations table
    await client.query(createMigrationsTable);
    console.log('✓ Created migrations table');

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations ORDER BY name'
    );
    const executedNames = executedMigrations.map(row => row.name);

    // Run pending migrations
    for (const file of files) {
      if (!executedNames.includes(file)) {
        console.log(`Running migration: ${file}`);

        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);

        console.log(`✓ Migration ${file} completed`);
      } else {
        console.log(`Skipping already executed migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

export { pool, runMigrations };