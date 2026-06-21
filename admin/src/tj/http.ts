const TJ_SEARCH_URL = "https://www.tjmedia.com/song/accompaniment_search";

const TJ_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";

export async function fetchTjSearchPage(
  params: URLSearchParams,
): Promise<string> {
  const response = await fetch(`${TJ_SEARCH_URL}?${params.toString()}`, {
    headers: {
      "User-Agent": TJ_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `TJ request failed: ${response.status} ${response.statusText}`,
    );
  }

  return await response.text();
}
