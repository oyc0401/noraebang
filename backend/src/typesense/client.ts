import { Client } from "typesense";

export function createTypesenseClient(): Client {
  return new Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST || "localhost",
        port: parseInt(process.env.TYPESENSE_PORT || "8108", 10),
        protocol: process.env.TYPESENSE_PROTOCOL || "http",
      },
    ],
    apiKey: process.env.TYPESENSE_API_KEY || "",
    connectionTimeoutSeconds: 30,
  });
}
