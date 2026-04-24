import { appendAuditLog } from '../repositories/audit-log.js';
import { closePool } from '../db/pool.js';
import { deleteUserById, findUserByUsername, getUserRoles } from '../repositories/users.js';

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : '';
}

async function main() {
  const username = readArg('username');

  if (!username) {
    throw new Error('username_required');
  }

  const user = await findUserByUsername(username);
  if (!user) {
    throw new Error('user_not_found');
  }

  const roles = await getUserRoles(user.id);
  if (roles.includes('owner')) {
    throw new Error('owner_delete_forbidden');
  }

  const deleted = await deleteUserById(user.id);
  if (!deleted) {
    throw new Error('user_delete_failed');
  }

  await appendAuditLog({
    actorUserId: null,
    actionKey: 'user.delete_script',
    targetType: 'user',
    targetKey: deleted.id,
    detail: {
      username: deleted.username,
      roles
    }
  });

  console.log(JSON.stringify({
    ok: true,
    userId: deleted.id,
    username: deleted.username,
    displayName: deleted.display_name,
    roles
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
