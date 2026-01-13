import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "typesense";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";
import type { OperationMode } from "typesense/lib/Typesense/Types";
import { preprocessSearchQuery } from "./lib/query-preprocessor";
import type { TypesenseSongDocument } from "./transformer-song";
import type { TypesenseArtistDocument } from "./transformer-artist";

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
      connectionTimeoutSeconds: 10,
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
    const preprocessedQuery = preprocessSearchQuery(query);

    return this.client
      .collections<TypesenseArtistDocument>("artists")
      .documents()
      .search({
        q: preprocessedQuery,
        query_by: [
          "q_name_ko_p",
          "q_name_ko_a",
          "q_name_ko_norm",
          "q_name_latin_p",
          "q_name_latin_a",
          "q_name_latin_norm",
          "q_name_ja_kanji_p",
          "q_name_ja_kanji_a",
          "q_name_ja_kanji_norm",
          "q_name_ja_kana_p",
          "q_name_ja_kana_a",
          "q_name_ja_kana_norm",
        ].join(","),
        sort_by: "_text_match(bucket_size:5):desc,popularity:desc",
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
    const preprocessedQuery = preprocessSearchQuery(query);

    const songQueryFields = [
      "q_song_ko_p",
      "q_song_ko_a",
      "q_song_ko_norm",
      "q_song_latin_p",
      "q_song_latin_a",
      "q_song_latin_norm",
      "q_song_ja_kanji_p",
      "q_song_ja_kanji_a",
      "q_song_ja_kanji_norm",
      "q_song_ja_kana_p",
      "q_song_ja_kana_a",
      "q_song_ja_kana_norm",
      "q_artist_ko_p",
      "q_artist_ko_a",
      "q_artist_ko_norm",
      "q_artist_latin_p",
      "q_artist_latin_a",
      "q_artist_latin_norm",
      "q_artist_ja_kanji_p",
      "q_artist_ja_kanji_a",
      "q_artist_ja_kanji_norm",
      "q_artist_ja_kana_p",
      "q_artist_ja_kana_a",
      "q_artist_ja_kana_norm",
      "q_combo_a",
    ];

    const normFields = new Set<string>([
      "q_song_ko_norm",
      "q_song_latin_norm",
      "q_song_ja_kanji_norm",
      "q_song_ja_kana_norm",
      "q_artist_ko_norm",
      "q_artist_latin_norm",
      "q_artist_ja_kanji_norm",
      "q_artist_ja_kana_norm",
    ]);
    const infixModes: OperationMode[] = songQueryFields.map((field) =>
      normFields.has(field) ? "always" : "off",
    );

    console.log("🔍 [Typesense] 검색 요청:", {
      originalQuery: query,
      preprocessedQuery,
      infixCount: infixModes.filter((m) => m === "always").length,
    });

    const result = await this.client
      .collections<TypesenseSongDocument>("songs")
      .documents()
      .search({
        q: preprocessedQuery,
        query_by: songQueryFields.join(","),
        sort_by: "_text_match:desc,songPopularity:desc",
        infix: infixModes,
        page,
        per_page: perPage,
      });

    console.log(
      `🔍 [Typesense] 검색 결과: ${result.hits?.length ?? 0}개, found: ${result.found}`,
    );
    if (result.hits && result.hits.length > 0) {
      console.log(
        `   첫 3개 ID: ${result.hits.slice(0, 3).map((h) => h.document.id).join(", ")}`,
      );
    }

    return result;
  }
}
