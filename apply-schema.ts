import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is required to run apply-schema.ts");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const sqlPath = path.resolve('./schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  console.log("🔌 Connecting to Supabase database...");
  const client = pool; // Use pool directly
  
  try {
    console.log("🛠️ Parsing triggers and functions from schema.sql...");
    const sectionIndex = sql.indexOf('-- 5. TRANSACTION STOCK LOCKS');
    if (sectionIndex === -1) {
      throw new Error("Could not find trigger section in schema.sql");
    }
    
    const endIndex = sql.indexOf('-- 7. ALARM AUDIT');
    // Extract only the triggers and functions portion. This is 100% idempotent!
    const triggersSql = endIndex !== -1 ? sql.substring(sectionIndex, endIndex) : sql.substring(sectionIndex);
    
    console.log("🛠️ Applying updated stock and inventory triggers in transaction...");
    await client.query(triggersSql);
    
    console.log("🟢 Triggers and stock reservation functions applied successfully!");
  } catch (err: any) {
    console.error("❌ Failed to apply triggers schema:", err.message || err);
  } finally {
    await pool.end();
  }
}

main();
