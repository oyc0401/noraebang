import { access, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export type LogValue =
  | string
  | number
  | boolean
  | Record<string, string | number | boolean>;

type LogStore = Record<string, LogValue>;

let cachedLogFilePath: string | undefined;

export async function getLogValue(key: string): Promise<LogValue | undefined> {
  const store = await readLogStore();
  return store[key];
}

export async function setLogValue(
  key: string,
  value: LogValue,
): Promise<void> {
  const store = await readLogStore();
  store[key] = value;
  await writeLogStore(store);
}

export async function incrementLogCounter(key: string): Promise<number> {
  const store = await readLogStore();
  const currentValue = store[key];
  const nextValue = typeof currentValue === "number" ? currentValue + 1 : 1;

  store[key] = nextValue;
  await writeLogStore(store);

  return nextValue;
}

export async function recordExecution(key: string): Promise<void> {
  await incrementLogCounter(`${key}.count`);
  await setLogValue(`${key}.lastExecutedAt`, new Date().toISOString());
}

export async function getLastExecutedAt(
  key: string,
): Promise<string | undefined> {
  const value = await getLogValue(`${key}.lastExecutedAt`);
  return typeof value === "string" ? value : undefined;
}

async function readLogStore(): Promise<LogStore> {
  const logFilePath = await getLogFilePath();
  const raw = await readFile(logFilePath, "utf8");

  if (raw.trim().length === 0) {
    return {};
  }

  const parsed = JSON.parse(raw) as LogStore;
  return parsed;
}

async function writeLogStore(store: LogStore): Promise<void> {
  const logFilePath = await getLogFilePath();
  await writeFile(logFilePath, `${JSON.stringify(store, null, 2)}\n`);
}

async function getLogFilePath(): Promise<string> {
  if (cachedLogFilePath) {
    return cachedLogFilePath;
  }

  cachedLogFilePath = await resolveLogFilePath();
  return cachedLogFilePath;
}

async function resolveLogFilePath(): Promise<string> {
  const candidates = [
    resolve(process.cwd(), "admin/src/api/collection/parser/log/log.json"),
    resolve(process.cwd(), "src/api/collection/parser/log/log.json"),
    resolve(__dirname, "log.json"),
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next common execution cwd.
    }
  }

  return resolve(__dirname, "log.json");
}
