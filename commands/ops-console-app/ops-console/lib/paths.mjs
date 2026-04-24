import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const opsConsoleDir = path.resolve(__dirname, '..');
export const appRoot = path.resolve(opsConsoleDir, '..');
export const repoRoot = path.resolve(appRoot, '..', '..');
export const commandsRoot = path.join(repoRoot, 'commands');
export const internalServerDir = path.join(repoRoot, 'kpi-runtime', 'internal-server');
export const publicDir = path.join(opsConsoleDir, 'public');
export const appVarDir = path.join(appRoot, 'var');
export const appLogsDir = path.join(appVarDir, 'logs');
export const appPortFile = path.join(appVarDir, 'ops-console-port.txt');
export const appPidFile = path.join(appVarDir, 'ops-console-pid.txt');
export const shutdownScheduleStateFile = path.join(appVarDir, 'shutdown-schedule.json');
export const startupProgramsDir = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup')
  : '';
export const startupScriptName = 'KPI-Central-Autostart.vbs';
export const legacyStartupShortcutName = 'KPI Demo Runtime Startup.lnk';
export const startupScriptFile = startupProgramsDir
  ? path.join(startupProgramsDir, startupScriptName)
  : '';
export const legacyStartupShortcutFile = startupProgramsDir
  ? path.join(startupProgramsDir, legacyStartupShortcutName)
  : '';
export const internalServerVarDir = path.join(internalServerDir, 'var');
export const internalServerLogsDir = path.join(internalServerVarDir, 'logs');
export const postgresLogFile = path.join(internalServerDir, 'var', 'central-runtime', 'postgres', 'logs', 'postgres.log');
export const envFilePath = path.join(internalServerDir, '.env.production.local');

export const internalServerScripts = {
  initializeRuntime: path.join(internalServerDir, 'scripts', 'windows', 'initialize-central-runtime.ps1'),
  startCentralStack: path.join(internalServerDir, 'scripts', 'windows', 'start-central-stack.ps1'),
  stopServer: path.join(internalServerDir, 'scripts', 'windows', 'stop-server.ps1'),
  stopLocalPostgres: path.join(internalServerDir, 'scripts', 'windows', 'stop-local-postgres.ps1'),
  recoverCentralStack: path.join(internalServerDir, 'scripts', 'windows', 'recover-central-stack.ps1'),
  registerStartupTask: path.join(internalServerDir, 'scripts', 'windows', 'register-startup-task.ps1'),
  unregisterStartupTask: path.join(internalServerDir, 'scripts', 'windows', 'unregister-startup-task.ps1'),
  openDbConsole: path.join(internalServerDir, 'scripts', 'windows', 'open-db-console.ps1'),
  scheduleStartup: path.join(internalServerDir, 'scripts', 'windows', 'schedule-computer-start-interactive.ps1'),
  scheduleShutdown: path.join(internalServerDir, 'scripts', 'windows', 'schedule-computer-shutdown-interactive.ps1')
};

export function ensureDirectory(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

ensureDirectory(appVarDir);
ensureDirectory(appLogsDir);
