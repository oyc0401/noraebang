import type { BraveWebSearchResult } from "../../../../lib/brave-search";

type OpenAIChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type TitleKoResponse = {
  titleKo?: string;
};

export async function getTitleFromAI(
  songTitle: string,
  artistName: string | null,
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
            'Return only JSON like {"titleKo":"아이돌"}. Find the Korean display title for this song as commonly written on Korean karaoke/music sites (usually a transliteration of the reading, not a translation). Do not return the artist name. If unsure, use "".',
        },
        {
          role: "user",
          content: JSON.stringify({
            songTitle,
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
      `OpenAI titleKo request failed: ${response.status} ${response.statusText} ${errorBody}`,
    );
  }

  const data = (await response.json()) as OpenAIChatResponse;
  const content = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseTitleKoResponse(content);

  return parsed.titleKo?.trim() ?? "";
}

function parseTitleKoResponse(content: string): TitleKoResponse {
  try {
    return JSON.parse(content) as TitleKoResponse;
  } catch {
    const jsonStart = content.indexOf("{");
    const jsonEnd = content.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      return {};
    }

    try {
      return JSON.parse(
        content.slice(jsonStart, jsonEnd + 1),
      ) as TitleKoResponse;
    } catch {
      return {};
    }
  }
}
