import { closePool } from '../db/pool.js';
import { listUsers } from '../repositories/users.js';

async function main() {
  const users = await listUsers();
  console.log(JSON.stringify({
    ok: true,
    users
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
