import { config } from '../config.js';
import { sendJson } from '../lib/http.js';
import { handleKpiRootHtml } from '../lib/kpi-static.js';
import { listUsers } from '../repositories/users.js';
import {
  bootstrapOwner,
  createManagedUser,
  login,
  logout,
  setUserPermission
} from '../services/auth.js';
import {
  clearAuthCookie,
  normalizeNextPath,
  normalizeText,
  parseBody,
  requireAdmin,
  requireAuth,
  sendRedirect,
  serializePermissionKey,
  writeAuthCookie
} from './route-context.js';

export function buildLoginPageHtml(nextPath) {
  const safeNext = JSON.stringify(normalizeNextPath(nextPath));
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>KPI Login</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Noto Sans KR", sans-serif;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #eef3ed;
      color: #1f2a24;
    }
    main {
      width: min(420px, calc(100vw - 32px));
      padding: 24px;
      background: #ffffff;
      border: 1px solid #d6dfd7;
      border-radius: 14px;
      box-shadow: 0 18px 40px rgba(25, 48, 34, 0.08);
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
    }
    p {
      margin: 0 0 16px;
      line-height: 1.5;
      color: #496053;
    }
    label {
      display: block;
      margin: 0 0 6px;
      font-size: 13px;
      color: #2f4137;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 11px 12px;
      margin: 0 0 14px;
      border: 1px solid #c7d3ca;
      border-radius: 10px;
      font: inherit;
    }
    button {
      width: 100%;
      padding: 11px 12px;
      border: 0;
      border-radius: 10px;
      background: #1c6a51;
      color: white;
      font: inherit;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .meta {
      margin-top: 12px;
      font-size: 12px;
      color: #607267;
    }
    .credential-hint {
      padding: 10px 12px;
      margin: 0 0 14px;
      border: 1px solid #c7d3ca;
      border-radius: 10px;
      background: #f6faf7;
      font-size: 13px;
      color: #2f4137;
    }
    .credential-hint strong {
      font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      color: #123c2f;
    }
    .error {
      min-height: 18px;
      margin: 8px 0 0;
      font-size: 13px;
      color: #b42318;
    }
  </style>
</head>
<body>
  <main>
    <h1>KPI Login</h1>
    <p>This public portfolio runtime uses a sample login.</p>
    <div class="credential-hint">Demo account: ID <strong>1234</strong> / password <strong>1234</strong></div>
    <form id="loginForm">
      <label for="username">Username</label>
      <input id="username" name="username" autocomplete="username" placeholder="1234" value="1234" required />
      <label for="password">Password</label>
      <input id="password" name="password" type="password" autocomplete="current-password" placeholder="1234" value="1234" required />
      <button id="submitButton" type="submit">Login</button>
      <div id="errorMessage" class="error"></div>
    </form>
    <div class="meta">Next: <span id="nextPath"></span></div>
  </main>
  <script>
    const nextPath = ${safeNext};
    document.getElementById('nextPath').textContent = nextPath;
    const form = document.getElementById('loginForm');
    const submitButton = document.getElementById('submitButton');
    const errorMessage = document.getElementById('errorMessage');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      errorMessage.textContent = '';
      submitButton.disabled = true;

      const body = {
        username: form.username.value,
        password: form.password.value
      };

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || 'login_failed');
        }
        window.location.replace(nextPath);
      } catch (error) {
        errorMessage.textContent = error.message === 'invalid_credentials'
          ? 'Invalid username or password.'
          : 'Login failed.';
      } finally {
        submitButton.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

export async function handleBootstrapOwner(context) {
  const { req, res } = context;
  const body = await parseBody(req);
  const user = await bootstrapOwner({
    username: normalizeText(body.username),
    displayName: normalizeText(body.displayName || body.username),
    password: normalizeText(body.password)
  });
  sendJson(res, 201, {
    ok: true,
    user
  });
}

export async function handleLogin(context) {
  const { req, res } = context;
  const body = await parseBody(req);
  const payload = await login({
    username: normalizeText(body.username),
    password: normalizeText(body.password),
    ipAddress: req.socket.remoteAddress || '',
    userAgent: normalizeText(req.headers['user-agent'])
  });
  writeAuthCookie(res, payload.rawToken, payload.expiresAt);
  sendJson(res, 200, {
    ok: true,
    user: payload.user,
    expiresAt: payload.expiresAt
  });
}

export async function handleLogout(context) {
  const { res, auth } = context;
  if (auth?.rawToken) {
    await logout(auth.rawToken);
  }
  clearAuthCookie(res);
  sendJson(res, 200, { ok: true });
}

export async function handleLoginPage(context) {
  const { req, res, url, auth } = context;
  if (!config.loginEnabled) {
    return handleKpiRootHtml(req, res);
  }

  const nextPath = normalizeNextPath(url.searchParams.get('next') || '/');
  if (auth?.user) {
    sendRedirect(res, nextPath);
    return;
  }

  const body = Buffer.from(buildLoginPageHtml(nextPath), 'utf8');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': body.length
  });
  res.end(body);
}

export async function handleCurrentUser(context) {
  const { res, auth } = context;
  requireAuth(auth);
  sendJson(res, 200, {
    ok: true,
    user: auth.user
  });
}

export async function handleListUsers(context) {
  const { res, auth } = context;
  requireAdmin(auth);
  sendJson(res, 200, {
    ok: true,
    users: await listUsers()
  });
}

export async function handleCreateUser(context) {
  const { req, res, auth } = context;
  requireAdmin(auth);
  const body = await parseBody(req);
  const user = await createManagedUser({
    actorUserId: auth.user.id,
    username: normalizeText(body.username),
    displayName: normalizeText(body.displayName || body.username),
    password: normalizeText(body.password),
    roles: Array.isArray(body.roles) ? body.roles : []
  });
  sendJson(res, 201, {
    ok: true,
    user
  });
}

export async function handleUpsertUserPermission(context, userId) {
  const { req, res, auth } = context;
  requireAdmin(auth);
  const body = await parseBody(req);
  const permission = await setUserPermission({
    actorUserId: auth.user.id,
    userId,
    permissionKey: serializePermissionKey(body.permissionKey),
    canRead: body.canRead !== false,
    canWrite: body.canWrite === true,
    expiresAt: body.expiresAt || null
  });
  sendJson(res, 200, {
    ok: true,
    permission
  });
}
