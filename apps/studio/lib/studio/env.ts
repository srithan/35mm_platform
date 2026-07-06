import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

var loadedEnv: Record<string, string> | null = null;

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) {
    return {};
  }

  var values: Record<string, string> = {};
  var lines = readFileSync(path, 'utf8').split(/\r?\n/);

  for (var line of lines) {
    var trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    var index = trimmed.indexOf('=');
    if (index <= 0) {
      continue;
    }

    var key = trimmed.slice(0, index).trim();
    var value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values[key] = value;
  }

  return values;
}

function loadLocalEnv(): Record<string, string> {
  if (loadedEnv) {
    return loadedEnv;
  }

  var cwd = process.cwd();
  var platformFromStudio = resolve(cwd, '../..');
  var files = [
    join(platformFromStudio, 'apps/worker/.env'),
    join(platformFromStudio, 'apps/api/.env'),
    join(platformFromStudio, '.env'),
    join(platformFromStudio, '.env.local'),
    join(cwd, 'apps/worker/.env'),
    join(cwd, 'apps/api/.env'),
    join(cwd, '.env'),
    join(cwd, '.env.local'),
    join(cwd, 'apps/studio/.env'),
    join(cwd, 'apps/studio/.env.local'),
  ];

  loadedEnv = files.reduce<Record<string, string>>(function (acc, file) {
    return { ...acc, ...parseEnvFile(file) };
  }, {});

  return loadedEnv;
}

export function getStudioEnv(name: string): string {
  return process.env[name] ?? loadLocalEnv()[name] ?? '';
}
