import { ApiProperty } from "@nestjs/swagger";

export type SearchSuggestionCardType =
  | "query"
  | "artist"
  | "song"
  | "recentQuery"
  | "playlist";

export class SearchSuggestionCardDto {
  @ApiProperty({
    enum: ["query", "recentQuery","artist", "song",  "playlist"],
    description: "카드 타입",
    example: "query",
  })
  type: SearchSuggestionCardType;

  @ApiProperty({
    description: "카드에 노출될 대표 타이틀",
    example: "아이유",
  })
  title: string;

  @ApiProperty({
    description: "카드가 참조하는 리소스의 고유 ID",
    required: false,
    example: 42,
  })
  id?: number;

  @ApiProperty({
    description: "리소스를 구분하기 위한 복합 ID (예: type:id)",
    required: false,
    example: "artist:42",
  })
  resourceId?: string;

  @ApiProperty({
    description: "보조 텍스트 (있을 경우)",
    required: false,
    example: "신인가수",
  })
  subtitle?: string;

  @ApiProperty({
    description: "카드에 사용할 썸네일",
    required: false,
    example: "https://i.ytimg.com/vi/default.jpg",
  })
  thumbnail?: string;

  @ApiProperty({
    description: "카드가 참조하는 아티스트의 고유 슬러그",
    required: false,
    example: "yoasobi",
  })
  slug?: string;

}

class SearchSuggestionsDataDto {
  @ApiProperty({
    type: [SearchSuggestionCardDto],
    description: "카드 UI로 렌더링 가능한 추천 아이템 목록",
    example: [
      {
        type: "query",
        title: "아이유",
      },
      {
        type: "recentQuery",
        title: "아이유 콘서트 일정",
      },
      {
        type: "artist",
        title: "YOASOBI (요아소비)",
        thumbnail: "https://img.youtube.com/yoasobi.jpg",
        id: 23,
        slug: "yoasobi",
      },
      {
        type: "song",
        title: "夜に駆ける (밤을 달리다)",
        subtitle: "YOASOBI / tj - 23523",
        thumbnail: "https://img.youtube.com/song.jpg",
        id: 14694,
      },
      {
        type: "playlist",
        title: "원피스 노래 모음",
        subtitle: "곡 50개",
        thumbnail: "https://img.youtube.com/playlist.jpg",
        id: 12,
      },
    ],
  })
  cards: SearchSuggestionCardDto[];
}

export class SearchSuggestionsResponseDto {
  @ApiProperty({ type: () => SearchSuggestionsDataDto })
  data: SearchSuggestionsDataDto;

  @ApiProperty({ example: "추천 검색어 조회 성공" })
  message: string;
}
