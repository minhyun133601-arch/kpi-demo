import { appendAuditLog } from '../repositories/audit-log.js';
import { closePool } from '../db/pool.js';
import { findUserByUsername, updateUserPasswordHash } from '../repositories/users.js';
import { hashPassword } from '../lib/crypto.js';

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : '';
}

async function main() {
  const username = readArg('username');
  const password = readArg('password');

  if (!username || !password) {
    throw new Error('username_and_password_required');
  }

  const user = await findUserByUsername(username);
  if (!user) {
    throw new Error('user_not_found');
  }

  const passwordHash = await hashPassword(password);
  const updated = await updateUserPasswordHash(user.id, passwordHash);
  if (!updated) {
    throw new Error('password_update_failed');
  }

  await appendAuditLog({
    actorUserId: null,
    actionKey: 'user.password_reset_script',
    targetType: 'user',
    targetKey: updated.id,
    detail: {
      username: updated.username
    }
  });

  console.log(JSON.stringify({
    ok: true,
    userId: updated.id,
    username: updated.username,
    displayName: updated.display_name
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
