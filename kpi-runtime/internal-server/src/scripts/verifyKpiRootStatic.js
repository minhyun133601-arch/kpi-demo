const baseUrl = process.env.KPI_BASE_URL || 'http://127.0.0.1:3104/';

function resolveUrl(relativeOrAbsolute) {
  return new URL(relativeOrAbsolute, baseUrl).toString();
}

function decodeHex(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return Buffer.from(normalized, 'hex').toString('utf8');
}

function collectLocalAssetUrls(html) {
  const regex = /(?:src|href)="([^"]+)"/g;
  const urls = new Set();
  let match;
  while ((match = regex.exec(html))) {
    const value = match[1];
    if (/^(https?:|data:|#)/i.test(value)) {
      continue;
    }
    urls.add(resolveUrl(value));
  }
  return [...urls];
}

function createSessionClient() {
  let cookieHeader = '';

  function readCookieHeader(response) {
    const cookieLines = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : [];
    if (Array.isArray(cookieLines) && cookieLines.length) {
      return cookieLines
        .map((line) => String(line || '').split(';')[0].trim())
        .filter(Boolean)
        .join('; ');
    }

    const fallback = response.headers.get('set-cookie');
    return String(fallback || '').split(';')[0].trim();
  }

  async function request(url, options = {}) {
    const headers = {
      ...(options.headers || {})
    };
    if (cookieHeader) {
      headers.cookie = cookieHeader;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      redirect: options.redirect || 'manual'
    });

    const nextCookieHeader = readCookieHeader(response);
    if (nextCookieHeader) {
      cookieHeader = nextCookieHeader;
    }

    return response;
  }

  return {
    request,
    getCookieHeader() {
      return cookieHeader;
    }
  };
}

async function requestText(client, url) {
  const response = await client.request(url);
  const text = await response.text();
  return {
    status: response.status,
    text,
    location: response.headers.get('location')
  };
}

async function requestJson(client, url, options = {}) {
  const response = await client.request(url, options);
  const text = await response.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return {
    status: response.status,
    json,
    text,
    location: response.headers.get('location')
  };
}

async function requestStatus(client, url) {
  const response = await client.request(url);
  await response.arrayBuffer();
  return response.status;
}

async function collectPublicAssetFailures(client) {
  const publicAssetUrls = [resolveUrl('/shared-assets/kpi-demo-logo.svg')];
  const failures = [];
  for (const url of publicAssetUrls) {
    try {
      const status = await requestStatus(client, url);
      if (status !== 200) {
        failures.push({ url, status });
      }
    } catch (error) {
      failures.push({ url, status: 'ERR', error: error.message });
    }
  }
  return failures;
}

function isLoginRequiredMode(bootstrapStatus) {
  return Boolean(bootstrapStatus?.authEnabled && bootstrapStatus?.loginEnabled);
}

async function loginIfNeeded(client, bootstrapStatus) {
  const username = decodeHex(process.env.KPI_SMOKE_USERNAME_HEX) || String(process.env.KPI_SMOKE_USERNAME || '').trim();
  const password = String(process.env.KPI_SMOKE_PASSWORD || '').trim();

  if (!bootstrapStatus?.authEnabled || !bootstrapStatus?.loginEnabled) {
    return {
      attempted: false,
      authenticated: false,
      credentialSupplied: false
    };
  }

  const rootBeforeLogin = await requestText(client, resolveUrl('/'));
  const meBeforeLogin = await requestJson(client, resolveUrl('/api/auth/me'));
  const loginPage = await requestText(client, resolveUrl(rootBeforeLogin.location || '/login'));

  const summary = {
    attempted: true,
    credentialSupplied: Boolean(username && password),
    rootBeforeLoginStatus: rootBeforeLogin.status,
    rootBeforeLoginLocation: rootBeforeLogin.location,
    meBeforeLoginStatus: meBeforeLogin.status,
    loginPageStatus: loginPage.status,
    authenticated: false
  };

  if (!summary.credentialSupplied) {
    return summary;
  }

  const loginResponse = await requestJson(client, resolveUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username,
      password
    })
  });

  summary.loginStatus = loginResponse.status;
  summary.user = loginResponse.json?.user?.username || '';

  if (loginResponse.status !== 200) {
    return summary;
  }

  const meAfterLogin = await requestJson(client, resolveUrl('/api/auth/me'));
  summary.meAfterLoginStatus = meAfterLogin.status;
  summary.authenticated = meAfterLogin.status === 200;
  return summary;
}

async function resolveHtmlSurface(client, bootstrapStatus, authSummary) {
  const root = await requestText(client, resolveUrl('/'));

  if (root.status === 200) {
    return {
      rootStatus: root.status,
      rootLocation: root.location,
      htmlStatus: root.status,
      htmlText: root.text,
      surface: 'root'
    };
  }

  if (isLoginRequiredMode(bootstrapStatus) && !authSummary.authenticated && root.status === 302) {
    const loginUrl = resolveUrl(root.location || '/login');
    const loginPage = await requestText(client, loginUrl);
    if (loginPage.status !== 200) {
      throw new Error(`login_page_failed:${loginPage.status}`);
    }

    return {
      rootStatus: root.status,
      rootLocation: root.location,
      htmlStatus: loginPage.status,
      htmlText: loginPage.text,
      surface: 'login_page'
    };
  }

  throw new Error(`root_request_failed:${root.status}`);
}

async function main() {
  const client = createSessionClient();
  const bootstrapStatus = await requestJson(client, resolveUrl('/api/bootstrap/status'));
  if (bootstrapStatus.status !== 200 || !bootstrapStatus.json?.ok) {
    throw new Error(`bootstrap_status_failed:${bootstrapStatus.status}`);
  }

  const failures = await collectPublicAssetFailures(client);
  const authSummary = await loginIfNeeded(client, bootstrapStatus.json);
  const htmlSurface = await resolveHtmlSurface(client, bootstrapStatus.json, authSummary);
  const assetUrls = collectLocalAssetUrls(htmlSurface.htmlText);
  for (const url of assetUrls) {
    try {
      const status = await requestStatus(client, url);
      if (status !== 200) {
        failures.push({ url, status });
      }
    } catch (error) {
      failures.push({ url, status: 'ERR', error: error.message });
    }
  }

  const authFailure =
    isLoginRequiredMode(bootstrapStatus.json) &&
    authSummary.credentialSupplied &&
    !authSummary.authenticated;

  const summary = {
    ok: failures.length === 0 && !authFailure,
    baseUrl,
    accessMode: bootstrapStatus.json.accessMode,
    authEnabled: bootstrapStatus.json.authEnabled,
    loginEnabled: bootstrapStatus.json.loginEnabled,
    surface: htmlSurface.surface,
    rootStatus: htmlSurface.rootStatus,
    rootLocation: htmlSurface.rootLocation,
    auth: authSummary,
    checked: assetUrls.length,
    failures
  };

  console.log(JSON.stringify(summary, null, 2));
  if (failures.length || authFailure) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        baseUrl,
        error: error.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
});
