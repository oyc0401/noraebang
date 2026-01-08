import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "typesense";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { TypesenseArtistDocument, TypesenseSongDocument } from "./transformer";

export interface TypesenseSearchParams {
  query: string;
  page?: number;
  perPage?: number;
}

@Injectable()
export class TypesenseService implements OnModuleInit {
  private client: Client;

  constructor(private configService: ConfigService) {
    this.client = new Client({
      nodes: [
        {
          host: this.configService.get<string>("TYPESENSE_HOST", "localhost"),
          port: this.configService.get<number>("TYPESENSE_PORT", 8108),
          protocol: this.configService.get<string>(
            "TYPESENSE_PROTOCOL",
            "http",
          ),
        },
      ],
      apiKey: this.configService.get<string>("TYPESENSE_API_KEY", ""),
      connectionTimeoutSeconds: 2,
    });
  }

  async onModuleInit() {
    const enabled = this.configService.get<string>("TYPESENSE_ENABLED", "true");
    if (enabled === "false") {
      console.log("Typesense is disabled (TYPESENSE_ENABLED=false)");
      return;
    }

    try {
      const health = await this.client.health.retrieve();
      console.log("Typesense connection successful:", health);
    } catch (error) {
      console.warn("Typesense connection failed (continuing anyway):", error);
    }
  }

  getClient(): Client {
    return this.client;
  }

  /**
   * 아티스트 검색
   */
  async searchArtists(
    params: TypesenseSearchParams,
  ): Promise<SearchResponse<TypesenseArtistDocument>> {
    const { query, page = 1, perPage = 20 } = params;

    return this.client.collections("artists").documents().search({
      q: query,
      query_by: [
        "q_name_ko_p",
        "q_name_ko_a",
        "q_name_latin_p",
        "q_name_latin_a",
        "q_name_ja_kanji_p",
        "q_name_ja_kanji_a",
        "q_name_ja_kana_p",
        "q_name_ja_kana_a",
      ].join(","),
      page,
      per_page: perPage,
    });
  }

  /**
   * 곡 검색
   */
  async searchSongs(
    params: TypesenseSearchParams,
  ): Promise<SearchResponse<TypesenseSongDocument>> {
    const { query, page = 1, perPage = 20 } = params;

    return this.client.collections("songs").documents().search({
      q: query,
      query_by: [
        // 곡 제목
        "q_song_ko_p",
        "q_song_ko_a",
        "q_song_latin_p",
        "q_song_latin_a",
        "q_song_ja_kanji_p",
        "q_song_ja_kanji_a",
        "q_song_ja_kana_p",
        "q_song_ja_kana_a",
        // 아티스트 이름
        "q_artist_ko_p",
        "q_artist_ko_a",
        "q_artist_raw_p",
        "q_artist_raw_a",
        "q_artist_ja_kanji_p",
        "q_artist_ja_kanji_a",
        "q_artist_ja_kana_p",
        "q_artist_ja_kana_a",
        // 조합 검색
        "q_combo_a",
      ].join(","),
      sort_by: "hasKaraokeNo:desc,_text_match:desc",
      page,
      per_page: perPage,
    });
  }
}
