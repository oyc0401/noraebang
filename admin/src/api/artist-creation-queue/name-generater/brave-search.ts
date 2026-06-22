export type BraveSearchRawResponse = Record<string, unknown>;

export type BraveWebSearchResult = {
  title: string;
  description: string;
  url: string;
};

const BRAVE_SEARCH_URL = "https://api.search.brave.com/res/v1/web/search";

export async function searchBraveRaw(
  query: string,
): Promise<BraveSearchRawResponse> {
  const normalizedQuery = query.trim();

  if (!normalizedQuery) {
    throw new Error("Brave search query is empty.");
  }

  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY is required.");
  }

  const url = new URL(BRAVE_SEARCH_URL);
  url.searchParams.set("q", normalizedQuery);
  url.searchParams.set("count", "10");
  url.searchParams.set("country", "kr");
  url.searchParams.set("search_lang", "ko");

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Brave search failed: ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as BraveSearchRawResponse;
}

export async function searchBraveWebResults(
  artistName: string,
): Promise<BraveWebSearchResult[]> {
  const response = await searchBraveRaw(`${artistName} jpop가수 한국어 이름`);
  const webResults = getWebResults(response);

  return webResults.slice(0, 10);
}

function getWebResults(response: BraveSearchRawResponse): BraveWebSearchResult[] {
  const rawResponse = getRecord(response.result);
  const braveResponse = Object.keys(rawResponse).length > 0 ? rawResponse : response;
  const results = getRecord(braveResponse.web)?.results;

  if (!Array.isArray(results)) {
    return [];
  }

  return results
    .map((item) => {
      const record = getRecord(item);
      const title = getString(record.title);
      const description = getString(record.description);
      const url = getString(record.url);

      if (!title || !url) {
        return null;
      }

      return {
        title,
        description,
        url,
      };
    })
    .filter((item): item is BraveWebSearchResult => item !== null);
}

function getRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
