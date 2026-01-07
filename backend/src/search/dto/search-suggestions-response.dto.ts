import { ApiProperty } from "@nestjs/swagger";
import { KaraokeSongDto } from "../../dto/song.dto";

export class SearchSuggestionSuggestionDto {
  @ApiProperty({ description: "추천 검색어 텍스트", example: "방탄소년단" })
  title: string;

  @ApiProperty({
    description: "추천 출처 (예: 최근 검색, 추천 등)",
    example: "recent",
  })
  source: string;
}

export class SearchSuggestionArtistDto {
  @ApiProperty({ description: "아티스트 ID", example: 23 })
  id: number;

  @ApiProperty({
    description: "아티스트 식별 슬러그",
    example: "yoasobi",
    required: false,
  })
  slug?: string;

  @ApiProperty({ description: "아티스트 제목", example: "YOASOBI" })
  title: string;

  @ApiProperty({
    description: "아티스트 한글 제목",
    example: "요아소비",
    required: false,
  })
  titleKo?: string;


  @ApiProperty({
    description: "아티스트 썸네일",
    example: "https://img.youtube.com/yoasobi.jpg",
    required: false,
  })
  thumbnail?: string;
}

export class SearchSuggestionSongDto {
  @ApiProperty({ description: "곡 ID", example: 14694 })
  id: number;

  @ApiProperty({ description: "곡 제목", example: "夜に駆ける" })
  title: string;

  @ApiProperty({
    description: "곡 한글 제목",
    example: "밤을 달리다",
    required: false,
  })
  titleKo?: string;

  @ApiProperty({
    description: "곡의 대표 아티스트명",
    example: "YOASOBI",
  })
  artistName: string;

  @ApiProperty({
    description: "곡의 대표 아티스트 slug",
    example: "yoasobi",
    required: false,
  })
  artistSlug?: string;

  @ApiProperty({
    type: [KaraokeSongDto],
    required: false,
    description: "노래방 곡 정보 목록"
  })
  karaokeSongs?: KaraokeSongDto[];

  @ApiProperty({
    description: "곡 썸네일",
    required: false,
    example: "https://img.youtube.com/song.jpg",
  })
  thumbnail?: string;
}

export class SearchSuggestionPlaylistDto {
  @ApiProperty({
    description: "플레이리스트 ID",
    example: 12,
  })
  id: number;

  @ApiProperty({
    description: "플레이리스트 제목",
    example: "원피스 노래 모음",
  })
  title: string;

  @ApiProperty({
    description: "플레이리스트 썸네일",
    required: false,
    example: "https://img.youtube.com/playlist.jpg",
  })
  thumbnail?: string;
}

export class SearchSuggestionCardDto {
  @ApiProperty({
    type: () => SearchSuggestionSuggestionDto,
    required: false,
    description: "추천 검색어 카드",
  })
  suggestion?: SearchSuggestionSuggestionDto;

  @ApiProperty({
    type: () => SearchSuggestionArtistDto,
    required: false,
    description: "아티스트 카드",
  })
  artist?: SearchSuggestionArtistDto;

  @ApiProperty({
    type: () => SearchSuggestionSongDto,
    required: false,
    description: "곡 카드"
  })
  song?: SearchSuggestionSongDto;

  @ApiProperty({
    type: () => SearchSuggestionPlaylistDto,
    required: false,
    description: "플레이리스트 카드",
  })
  playlist?: SearchSuggestionPlaylistDto;
}

class SearchSuggestionsDataDto {
  @ApiProperty({
    type: [SearchSuggestionCardDto],
    description: "카드 UI로 렌더링 가능한 추천 아이템 목록",
  })
  cards: SearchSuggestionCardDto[];
}

export class SearchSuggestionsResponseDto {
  @ApiProperty({
    type: () => SearchSuggestionsDataDto,
  })
  data: SearchSuggestionsDataDto;

  @ApiProperty({ example: "추천 검색어 조회 성공" })
  message: string;
}
