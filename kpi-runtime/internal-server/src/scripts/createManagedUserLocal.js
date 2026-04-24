import { closePool } from '../db/pool.js';
import { createManagedUser } from '../services/auth.js';

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : '';
}

function readRoles() {
  const raw = readArg('roles');
  if (!raw) {
    return ['viewer'];
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

async function main() {
  const username = readArg('username');
  const displayName = readArg('displayName');
  const password = readArg('password');
  const roles = readRoles();

  if (!username || !password) {
    throw new Error('username_and_password_required');
  }

  const user = await createManagedUser({
    actorUserId: null,
    username,
    displayName: displayName || username,
    password,
    roles
  });

  console.log(JSON.stringify({
    ok: true,
    user,
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
