import { closePool } from '../db/pool.js';
import { seedWorkRuntimeBootstrap } from '../lib/local-db-baseline.js';

function hasDryRunFlag(argv = []) {
  return (Array.isArray(argv) ? argv : []).some((value) => String(value || '').trim() === '--dry-run');
}

async function main() {
  const result = await seedWorkRuntimeBootstrap({
    dryRun: hasDryRunFlag(process.argv.slice(2))
  });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
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
  })
  .finally(async () => {
    await closePool().catch(() => {});
  });
