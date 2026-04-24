import { pruneExpiredSessions } from '../repositories/sessions.js';
import { closePool } from '../db/pool.js';

async function main() {
  const removedCount = await pruneExpiredSessions();
  process.stdout.write(
    `${JSON.stringify({ ok: true, removedCount }, null, 2)}\n`
  );
}

main()
  .catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
