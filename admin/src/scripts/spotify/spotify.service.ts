export interface SpotifyArtist {
  id: string;
  name: string;
  followers: {
    total: number;
  };
  images: Array<{
    url: string;
    height: number;
    width: number;
  }>;
  genres: string[];
  popularity: number;
  external_urls: {
    spotify: string;
  };
}

export class SpotifyService {
  private accessToken?: string;
  private tokenExpiresAt: number = 0;

  /**
   * Spotify Access Token 가져오기 (Client Credentials Flow)
   */
  private async getAccessToken(): Promise<string> {
    // 토큰이 유효하면 재사용
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set",
      );
    }

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });

    if (!response.ok) {
      throw new Error(
        `Failed to get Spotify access token: ${response.statusText}`,
      );
    }

    const data: any = await response.json();
    const token = data.access_token;
    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + data.expires_in * 1000 - 60000; // 1분 여유

    return token;
  }

  /**
   * Spotify에서 아티스트 검색
   * @param artistName 검색할 아티스트 이름
   * @param limit 결과 개수 (기본 5)
   * @returns 검색 결과 (유사도 순으로 정렬됨)
   */
  async searchArtist(
    artistName: string,
    limit: number = 10,
  ): Promise<SpotifyArtist[]> {
    const accessToken = await this.getAccessToken();
    const query = encodeURIComponent(artistName);

    const response = await fetch(
      `https://api.spotify.com/v1/search?q=${query}&type=artist&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to search artist "${artistName}": ${response.statusText}`,
      );
    }

    const data: any = await response.json();

    return data.artists.items;
  }

  /**
   * 가장 일치하는 아티스트 찾기
   * @param artistName 검색할 아티스트 이름
   * @returns 가장 일치하는 아티스트 또는 undefined
   */
  async findBestMatch(artistName: string): Promise<SpotifyArtist | undefined> {
    const results = await this.searchArtist(artistName, 20);

    if (results.length === 0) {
      return undefined;
    }

    // 정확히 일치하는 이름 찾기 (대소문자 무시)
    const exactMatch = results.find(
      (artist) => artist.name.toLowerCase() === artistName.toLowerCase(),
    );

    if (exactMatch) {
      return exactMatch;
    }

    // 정확히 일치하지 않으면 첫 번째 결과 반환 (신뢰도 낮음)
    return results[0];
  }

  /**
   * Spotify ID로 아티스트 정보 가져오기
   * @param spotifyId Spotify 아티스트 ID
   * @returns 아티스트 정보
   */
  async getArtistById(spotifyId: string): Promise<SpotifyArtist> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(
      `https://api.spotify.com/v1/artists/${spotifyId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `Failed to get artist with ID "${spotifyId}": ${response.statusText}`,
      );
    }

    return (await response.json()) as SpotifyArtist;
  }
}
