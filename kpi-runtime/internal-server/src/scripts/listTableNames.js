import { closePool, query } from '../db/pool.js';

async function main() {
  const result = await query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);

  console.log(JSON.stringify({
    ok: true,
    tables: result.rows.map((row) => row.table_name)
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error.message
  }, null, 2));
  process.exitCode = 1;
}).finally(async () => {
  await closePool().catch(() => {});
});
