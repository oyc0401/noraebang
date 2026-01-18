import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { disconnect } from "./prisma.js";
import {
  getUnmappedData,
  applyMapping,
  type MappingPayload,
} from "./tools/song-mapper.js";

const server = new Server(
  {
    name: "song-mapper",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool 목록 반환
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "get_unmapped_data",
      description:
        "아티스트의 매핑 안된 곡과 유튜브 영상을 조회합니다. 조회수 100만 이상 영상만 반환됩니다.",
      inputSchema: {
        type: "object" as const,
        properties: {
          artistId: {
            type: "number",
            description: "아티스트 ID",
          },
        },
        required: ["artistId"],
      },
    },
    {
      name: "apply_mapping",
      description: "곡과 유튜브 영상의 매핑을 적용합니다.",
      inputSchema: {
        type: "object" as const,
        properties: {
          artistId: {
            type: "number",
            description: "아티스트 ID",
          },
          song: {
            type: "array",
            description: "매핑할 곡-영상 목록",
            items: {
              type: "object",
              properties: {
                songId: { type: "number", description: "곡 ID" },
                songTitle: { type: "string", description: "곡 제목" },
                videoId: { type: "string", description: "유튜브 영상 ID" },
                videoName: { type: "string", description: "영상 제목" },
              },
              required: ["songId", "songTitle", "videoId", "videoName"],
            },
          },
        },
        required: ["artistId", "song"],
      },
    },
  ],
}));

// Tool 실행
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get_unmapped_data") {
      const artistId = (args as { artistId: number }).artistId;
      const data = await getUnmappedData(artistId);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }

    if (name === "apply_mapping") {
      const payload = args as MappingPayload;
      const result = await applyMapping(payload);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      content: [
        {
          type: "text" as const,
          text: `Error: ${message}`,
        },
      ],
      isError: true,
    };
  }
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Song Mapper MCP Server running on stdio");
}

// 종료 처리
process.on("SIGINT", async () => {
  await disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await disconnect();
  process.exit(0);
});

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
