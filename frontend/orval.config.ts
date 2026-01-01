import { defineConfig } from "orval";

export default defineConfig({
  api: {
    input: {
      target: "../backend/swagger.json",
    },
    output: {
      mode: "tags-split",
      target: "./src/lib/generated/endpoints.ts",
      schemas: "./src/lib/generated/models",
      client: "react-query",
      override: {
        mutator: {
          path: "./src/lib/api-client.ts",
          name: "customFetch",
        },
      },
    },
  },
});
