import { defineConfig } from "orval";

const swaggerSchemaUrl =
  process.env.NEXT_PUBLIC_SWAGGER_URL ?? "http://localhost:3001/api-json";

export default defineConfig({
  api: {
    input: {
      target: swaggerSchemaUrl,
    },
    output: {
      mode: "tags-split",
      target: "./src/api/endpoints.ts",
      schemas: "./src/api/models",
      clean: ["./src/api"],
      client: "react-query",
      override: {
        query: {
          version: 5,
        },
        mutator: {
          path: "./src/lib/api-client.ts",
          name: "customFetch",
        },
      },
    },
  },
});
