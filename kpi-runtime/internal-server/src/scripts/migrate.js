import { config } from '../config.js';
import { runMigrations } from '../db/migrate.js';
import { closePool } from '../db/pool.js';

try {
  const result = await runMigrations();
  console.log(
    JSON.stringify(
      {
        ok: true,
        databaseUrl: config.databaseUrl,
        applied: result.applied,
        adopted: result.adopted
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
} finally {
  await closePool().catch(() => {});
}
