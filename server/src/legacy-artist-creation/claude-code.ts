import { spawn } from "node:child_process";

export type ArtistCreationClaudeInput = {
  title: string;
  rawArtist: string;
  youtubeLink?: string | null;
  thumbnailImg?: string | null;
};

export type ArtistCreationClaudeResult = {
  name: string;
  slug: string;
  nameKo: string;
  youtube_channel: string | null;
  youtube_topic_channel: string | null;
  spotifyId: string | null;
  thumbnailDefault: string | null;
  thumbnailHigh: string | null;
  thumbnailMedium: string | null;
};

export type ClaudeCodeArtistLookupOptions = {
  claudePath?: string;
  model?: string;
  timeoutMs?: number;
  maxBudgetUsd?: number;
  tools?: string[];
};

const DEFAULT_TIMEOUT_MS = 2 * 60 * 1000;

const DEFAULT_TOOLS = ["WebSearch", "WebFetch", "Bash(curl *)"];

const ARTIST_RESULT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    slug: { type: "string" },
    nameKo: { type: "string" },
    youtube_channel: { type: ["string", "null"] },
    youtube_topic_channel: { type: ["string", "null"] },
    spotifyId: { type: ["string", "null"] },
    thumbnailDefault: { type: ["string", "null"] },
    thumbnailHigh: { type: ["string", "null"] },
    thumbnailMedium: { type: ["string", "null"] },
  },
  required: [
    "name",
    "slug",
    "nameKo",
    "youtube_channel",
    "youtube_topic_channel",
    "spotifyId",
    "thumbnailDefault",
    "thumbnailHigh",
    "thumbnailMedium",
  ],
} as const;

export async function lookupArtistWithClaudeCode(
  input: ArtistCreationClaudeInput,
  options: ClaudeCodeArtistLookupOptions = {},
): Promise<ArtistCreationClaudeResult> {
  const stdout = await runClaudeCode(buildArtistLookupPrompt(input), options);
  return parseClaudeArtistResult(stdout);
}

function runClaudeCode(
  prompt: string,
  options: ClaudeCodeArtistLookupOptions,
): Promise<string> {
  const tools = options.tools ?? DEFAULT_TOOLS;

  const args = [
    "-p",
    "Use stdin as task. Return structured JSON only.",

    "--output-format",
    "json",

    "--json-schema",
    JSON.stringify(ARTIST_RESULT_SCHEMA),

    "--tools",
    tools.join(","),

    "--allowedTools",
    tools.join(","),

    "--max-turns",
    "6",

    "--max-budget-usd",
    String(options.maxBudgetUsd ?? 0.08),
  ];

  if (options.model) {
    args.push("--model", options.model);
  }

  const claude = spawn(options.claudePath ?? "claude", args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    claude.kill("SIGTERM");

    setTimeout(() => {
      if (!claude.killed) {
        claude.kill("SIGKILL");
      }
    }, 5_000);
  }, options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  return new Promise((resolve, reject) => {
    claude.stdin.end(prompt);

    claude.stdout.setEncoding("utf8");
    claude.stderr.setEncoding("utf8");

    claude.stdout.on("data", (chunk) => {
      stdout += chunk;
    });

    claude.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    claude.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    claude.on("close", (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject(
          new Error(
            [
              "Claude Code timeout",
              `STDERR:`,
              stderr.slice(0, 3000),
              `STDOUT:`,
              stdout.slice(0, 3000),
            ].join("\n"),
          ),
        );
        return;
      }

      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          [
            `Claude Code failed with exit code ${code ?? "unknown"}`,
            extractClaudeError(stdout, stderr),
            `STDERR:`,
            stderr.slice(0, 3000),
            `STDOUT:`,
            stdout.slice(0, 3000),
          ].join("\n"),
        ),
      );
    });
  });
}

function buildArtistLookupPrompt(input: ArtistCreationClaudeInput): string {
  return `artist_creation_queue 채워.

규칙:
- rawArtist 그대로 믿지 마.
- TJ 표기 더러울 수 있음.
- feat, vocal, cover, karaoke, lyric reupload 구분해.
- 진짜 canonical artist 찾아.
- 모르면 null.
- nameKo 모르면 "".
- ID는 URL 말고 ID만.
- 출력은 JSON만.

찾을 것:
- name: canonical artist name
- slug: lowercase url slug
- nameKo: Korean display name
- youtube_channel: official main channel ID
- youtube_topic_channel: official Topic channel ID
- spotifyId: Spotify artist ID
- thumbnailDefault
- thumbnailHigh
- thumbnailMedium

입력:
${JSON.stringify(input, null, 2)}

주의:
- rawArtist가 "164(Feat.GUMI)GUMI", title이 "天ノ弱"면 name은 보통 "164" 쪽임. "164GUMI" 아님.

JSON shape:
{
  "name": "",
  "slug": "",
  "nameKo": "",
  "youtube_channel": null,
  "youtube_topic_channel": null,
  "spotifyId": null,
  "thumbnailDefault": null,
  "thumbnailHigh": null,
  "thumbnailMedium": null
}`;
}

function parseClaudeArtistResult(stdout: string): ArtistCreationClaudeResult {
  try {
    const outer = JSON.parse(stdout.trim()) as unknown;
    const candidate = unwrapClaudeJsonOutput(outer);
    assertArtistCreationClaudeResult(candidate);
    return normalizeClaudeResult(candidate);
  } catch (error) {
    const preview = stdout.trim().slice(0, 3000);
    throw new Error(`Failed to parse Claude Code output: ${error}\n${preview}`);
  }
}

function unwrapClaudeJsonOutput(value: unknown): unknown {
  if (typeof value === "string") {
    return parseJsonObjectText(value);
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    if (record.structured_output) {
      return record.structured_output;
    }

    if (typeof record.result === "string") {
      return parseJsonObjectText(record.result);
    }

    if (typeof record.output_text === "string") {
      return parseJsonObjectText(record.output_text);
    }
  }

  return value;
}

function parseJsonObjectText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");

    if (start >= 0 && end > start) {
      return JSON.parse(text.slice(start, end + 1));
    }

    throw new Error(`Claude result did not contain a JSON object: ${text}`);
  }
}

function assertArtistCreationClaudeResult(
  value: unknown,
): asserts value is ArtistCreationClaudeResult {
  if (!value || typeof value !== "object") {
    throw new Error("Claude artist result is not an object");
  }

  const result = value as Partial<ArtistCreationClaudeResult>;

  if (typeof result.name !== "string") {
    throw new Error("Claude artist result must include name string");
  }

  if (typeof result.slug !== "string") {
    throw new Error("Claude artist result must include slug string");
  }

  if (typeof result.nameKo !== "string") {
    throw new Error("Claude artist result must include nameKo string");
  }

  assertNullableString(result.youtube_channel, "youtube_channel");
  assertNullableString(result.youtube_topic_channel, "youtube_topic_channel");
  assertNullableString(result.spotifyId, "spotifyId");
  assertNullableString(result.thumbnailDefault, "thumbnailDefault");
  assertNullableString(result.thumbnailHigh, "thumbnailHigh");
  assertNullableString(result.thumbnailMedium, "thumbnailMedium");
}

function assertNullableString(value: unknown, field: string): void {
  if (value !== null && typeof value !== "string") {
    throw new Error(
      `Claude artist result field ${field} must be string or null`,
    );
  }
}

function normalizeClaudeResult(
  result: ArtistCreationClaudeResult,
): ArtistCreationClaudeResult {
  return {
    name: normalizeName(result.name),
    slug: createSlugBase(result.slug || result.name),
    nameKo: normalizeName(result.nameKo),
    youtube_channel: normalizeNullableString(result.youtube_channel),
    youtube_topic_channel: normalizeNullableString(
      result.youtube_topic_channel,
    ),
    spotifyId: normalizeNullableString(result.spotifyId),
    thumbnailDefault: normalizeNullableString(result.thumbnailDefault),
    thumbnailHigh: normalizeNullableString(result.thumbnailHigh),
    thumbnailMedium: normalizeNullableString(result.thumbnailMedium),
  };
}

function normalizeNullableString(value: string | null): string | null {
  const normalized = normalizeName(value);
  return normalized || null;
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐-‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function createSlugBase(value: string): string {
  const slug = normalizeName(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "artist";
}

function extractClaudeError(stdout: string, stderr: string): string {
  try {
    const parsed = JSON.parse(stdout) as {
      is_error?: boolean;
      result?: string;
    };

    if (parsed.is_error && parsed.result) {
      return parsed.result;
    }
  } catch {
    // ignore
  }

  return stderr || stdout || "Unknown Claude Code error";
}
