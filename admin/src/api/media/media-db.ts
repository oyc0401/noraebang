import { Client } from "pg";

// media DB는 별도 Postgres이므로 Prisma 대신 pg로 직접 접근한다. (media-lookup.ts와 동일한 방식)
export async function withMediaDb<T>(
  task: (client: Client) => Promise<T>,
): Promise<T> {
  const databaseUrl = process.env.MEDIA_DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error("MEDIA_DATABASE_URL is required");
  }

  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    return await task(client);
  } finally {
    await client.end();
  }
}
