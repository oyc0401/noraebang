import type { BraveWebSearchResult } from "./brave-search";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type NameKoResponse = {
  nameKo?: string;
};

export async function getNameFromAI(
  artistName: string,
  searchResults: BraveWebSearchResult[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey || searchResults.length === 0) {
    return "";
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-5.4-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Return only JSON like {"nameKo":"구미"}. Find the Korean display name for the artist. Do not return song title translations. If unsure, use "".',
        },
        {
          role: "user",
          content: JSON.stringify({
            artistName,
            searchResults,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();

    throw new Error(
      `OpenAI nameKo request failed: ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseNameKoResponse(content);

  return parsed.nameKo?.trim() ?? "";
}

function parseNameKoResponse(content: string): NameKoResponse {
  try {
    return JSON.parse(content) as NameKoResponse;
  } catch {
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return {};
    }

    try {
      return JSON.parse(
        content.slice(jsonStart, jsonEnd + 1),
      ) as NameKoResponse;
    } catch {
      return {};
    }
  }
}
