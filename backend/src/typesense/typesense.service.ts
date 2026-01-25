import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "typesense";
import type { SearchResponse } from "typesense/lib/Typesense/Documents";
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
          "q_name_ko_norm",
          "q_name_latin_p",
          "q_name_latin_norm",
          "q_name_ja_kanji_p",
          "q_name_ja_kanji_norm",
          "q_name_ja_kana_p",
          "q_name_ja_kana_norm",
          "q_artist_pron",
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

    const originalQuery = (query ?? "").trim();
    const preprocessedQuery = preprocessSearchQuery(originalQuery).trim();

    // q가 비었으면 인기순 목록(또는 최신순)을 리턴하도록 처리
    // Typesense는 q="*" 로 전체 문서 조회 가능 (필터와 함께 자주 씀). :contentReference[oaicite:2]{index=2}
    const q1 = preprocessedQuery.length > 0 ? preprocessedQuery : "*";

    // ✅ 실제 문서에 존재하는 필드만 사용 (현재 예시 문서 기준)
    // 우선순위: combo > 제목 norm > 발음 norm > 제목 원문 > 발음 원문 > artist
    const queryByFields = [
      "q_combo_a",
      "q_song_ko_norm",
      "q_song_ja_norm",
      "q_song_latin_norm",
      "q_song_pronu_norm",
      "q_song_latin_p",
      "q_song_pronu",
      "artist_key",
    ];

    // weights는 “상대 가중치”이고 0~127 범위. :contentReference[oaicite:3]{index=3}
    // (주의: _text_match 숫자 자체가 weights로 변하지 않을 수 있어도, 랭킹에는 반영됩니다.) :contentReference[oaicite:4]{index=4}
    const queryByWeights = [
      127, // q_combo_a
      90, // ko_norm
      90, // ja_norm
      80, // latin_norm
      80, // pron_norm
      60, // latin_p (공백 포함 exact를 살리고 싶으면 남겨둠)
      55, // pron (공백 포함 발음)
      45, // artist_key
    ];

    // 공백/붙임 검색 보강: split_join_tokens=fallback 권장 :contentReference[oaicite:5]{index=5}
    // exact match 우대는 기본적으로 중요(특히 p 필드) :contentReference[oaicite:6]{index=6}
    const baseSearchParams = {
      query_by: queryByFields.join(","),
      query_by_weights: queryByWeights.join(","),
      split_join_tokens: "fallback" as const,
      prioritize_exact_match: true,
      sort_by: "_text_match(buckets: 10):desc,songScore:desc",
      page,
      per_page: perPage,
    };

    console.log("🔍 [Typesense] 검색 요청:", {
      originalQuery,
      preprocessedQuery,
      q1,
      query_by: baseSearchParams.query_by,
      query_by_weights: baseSearchParams.query_by_weights,
    });

    const doSearch = (q: string) =>
      this.client
        .collections<TypesenseSongDocument>("songs")
        .documents()
        .search({
          q,
          ...baseSearchParams,
        });

    // 1차: 전처리된 쿼리
    let result = await doSearch(q1);

    // 2차 fallback: 전처리가 오히려 손해인 케이스 방어
    // (q="*"인 경우에는 fallback 불필요)
    if (
      q1 !== "*" &&
      (result.found ?? 0) === 0 &&
      originalQuery.length > 0 &&
      originalQuery !== preprocessedQuery
    ) {
      console.log("🔁 [Typesense] 0건 fallback 검색:", { q: originalQuery });
      result = await doSearch(originalQuery);
    }

    console.log(
      `🔍 [Typesense] 검색 결과: ${result.hits?.length ?? 0}개, found: ${result.found}`,
    );
    if (result.hits && result.hits.length > 0) {
      console.log(
        `   첫 3개 ID: ${result.hits
          .slice(0, 3)
          .map((h) => h.document.id)
          .join(", ")}`,
      );
    }

    return result;
  }
}
