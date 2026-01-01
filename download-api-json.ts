import { writeFile } from "node:fs/promises";

// pnpm ts-node download-api-json.ts

const URL = "http://localhost:3001/api-json";
const OUTPUT = "api-json.json";

async function main() {
  try {
    const response = await fetch(URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const body = await response.text();
    await writeFile(OUTPUT, body);

    console.log(`Saved ${URL} to ${OUTPUT}`);
  } catch (error) {
    console.error("Failed to download api-json:", error);
    process.exitCode = 1;
  }
}

void main();
