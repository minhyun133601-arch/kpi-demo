import http from 'node:http';
import { config, runtimePaths } from './config.js';
import { runMigrations } from './db/migrate.js';
import { closePool } from './db/pool.js';
import { sendJson } from './lib/http.js';
import { pruneExpiredSessions } from './repositories/sessions.js';
import { initializeFileStorage } from './services/files.js';
import { getRouteErrorStatusCode, routeRequest } from './request-router.js';

async function runSessionCleanup(tag = 'scheduled') {
  try {
    const removedCount = await pruneExpiredSessions();
    if (removedCount > 0) {
      console.log(`[kpi-demo-runtime] session cleanup (${tag}): removed ${removedCount}`);
    }
    return removedCount;
  } catch (error) {
    console.warn(`[kpi-demo-runtime] session cleanup (${tag}) failed: ${error.message}`);
    return 0;
  }
}

async function start() {
  await initializeFileStorage();

  if (config.autoMigrate) {
    try {
      const result = await runMigrations();
      if (result.applied.length) {
        console.log(`[kpi-demo-runtime] applied migrations: ${result.applied.join(', ')}`);
      }
      if (result.adopted.length) {
        console.log(
          `[kpi-demo-runtime] adopted legacy migration ids: ${result.adopted
            .map((item) => `${item.legacyId} -> ${item.canonicalId}`)
            .join(', ')}`
        );
      }
    } catch (error) {
      console.warn(`[kpi-demo-runtime] migration skipped or failed: ${error.message}`);
    }
  }

  await runSessionCleanup('startup');
  let sessionCleanupInterval = null;
  if (config.sessionPruneIntervalMinutes > 0) {
    sessionCleanupInterval = setInterval(() => {
      runSessionCleanup('interval').catch(() => {});
    }, config.sessionPruneIntervalMinutes * 60 * 1000);
    sessionCleanupInterval.unref();
  }

  const server = http.createServer(async (req, res) => {
    try {
      await routeRequest(req, res);
    } catch (error) {
      sendJson(res, getRouteErrorStatusCode(error), {
        ok: false,
        error: error.message
      });
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(`[kpi-demo-runtime] listening on http://${config.host}:${config.port}`);
    console.log(`[kpi-demo-runtime] storage root: ${config.storageRoot}`);
    console.log(`[kpi-demo-runtime] files root: ${runtimePaths.filesRoot}`);
  });

  let shuttingDown = false;
  async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;
    if (sessionCleanupInterval) clearInterval(sessionCleanupInterval);
    console.log(`[kpi-demo-runtime] shutting down (${signal})`);
    server.close(async () => {
      try {
        await closePool();
      } catch (error) {
        console.warn(`[kpi-demo-runtime] pool close failed during ${signal}: ${error.message}`);
      } finally {
        process.exit(0);
      }
    });

    setTimeout(() => {
      process.exit(1);
    }, 5000).unref();
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => {});
  });
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => {});
  });
}

start().catch((error) => {
  console.error('[kpi-demo-runtime] fatal startup error');
  console.error(error);
  process.exitCode = 1;
});
