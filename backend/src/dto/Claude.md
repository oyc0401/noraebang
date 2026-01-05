# DTO 작성 규칙

이 폴더는 여러 모듈에서 공통으로 사용되는 DTO를 관리합니다.

## 타입 규칙

### ✅ Optional 필드는 `?` 사용
```typescript
export class ArtistDto {
  @ApiProperty({ example: "YOASOBI" })
  name: string;

  @ApiProperty({ example: "yoasobi", required: false })
  slug?: string;  // ✅ 좋은 예
}
```

### ❌ `| null` 사용 금지
```typescript
export class ArtistDto {
  slug?: string | null;  // ❌ 나쁜 예
}
```

**이유:**
- Prisma에서 `string | null`을 반환하지만, Service 레이어에서 `?? undefined`로 변환
- API 응답에서는 `undefined` (필드 없음)가 더 깔끔함

## DTO 클래스 작성 규칙

### 1. 모든 DTO는 `class`로 정의
```typescript
// ✅ 좋은 예
export class SongDto {
  @ApiProperty({ example: 101 })
  id: number;
}

// ❌ 나쁜 예
export interface SongDto {  // interface 사용 금지
  id: number;
}
```

### 2. `@ApiProperty()` 데코레이터 필수
```typescript
export class OembedDataDto {
  @ApiProperty({ example: "YOASOBI - 夜に駆ける" })
  title: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({
    example: "MAIN",
    enum: ["MAIN", "FEATURING", "PRODUCER"],
    required: false
  })
  role?: string;
}
```

## Service에서 DTO 변환

Prisma는 `null`을 반환하지만, DTO는 `undefined`를 사용하므로 변환이 필요합니다:

```typescript
async findAll(): Promise<SongDto[]> {
  const songs = await this.prisma.song.findMany({
    select: {
      id: true,
      title: true,
      titleKo: true,  // string | null
    },
  });

  return songs.map(song => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo ?? undefined,  // null → undefined 변환
  }));
}
```

## 파일 구조

```
src/
├── dto/                        # 공통 DTO
│   ├── artist.dto.ts          # Artist 관련 공통 DTO
│   ├── song.dto.ts            # Song 관련 공통 DTO
│   ├── youtube.dto.ts         # YouTube 관련 공통 DTO
│   └── index.ts               # re-export
│
└── [module]/dto/              # 모듈별 Response Wrapper
    └── [module]-response.dto.ts
```

## Controller에서 사용

```typescript
@SwaggerApiResponse({ type: SongListResponseDto })
async findAll(): Promise<SongListResponseDto> {
  const songs = await this.songsService.findAll();
  return ApiResponse.success(songs);
}
```

**중요:**
- 제네릭 타입 `ApiResponse<T>`는 Swagger가 인식 못함
- 반드시 구체적인 Response DTO 클래스 생성 (`SongListResponseDto` 등)
- 모든 컨트롤러 메서드는 반환 타입 명시 필수
