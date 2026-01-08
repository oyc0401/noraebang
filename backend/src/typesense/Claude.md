# Typesense Transformer 테스트 규칙

## 필수 테스트 작성 규칙

Transformer 로직에 새로운 기능을 추가할 때는 **무조건 테스트 코드를 작성**해야 합니다.

### 테스트 작성이 필수인 경우

1. **문자열 처리 로직 추가 시**
   - 괄호 제거 (`removeBrackets`)
   - 한자/가나 감지 (`detectJapaneseType`)
   - 카타카나 → 히라가나 변환 (`katakanaToHiragana`)
   - 기타 텍스트 정규화 로직

2. **검색 필드 매핑 로직 변경 시**
   - q_* 필드에 데이터를 추가하는 로직
   - 별칭 처리 로직
   - Tier 분류 로직 (P/A/A2/F)

3. **새로운 언어/문자 처리 로직 추가 시**
   - 일본어, 한국어, 라틴 문자 처리
   - 특수 문자 처리

### 테스트 파일 위치

- `src/typesense/transformer.spec.ts`

### 테스트 작성 예시

```typescript
describe("removeBrackets", () => {
  it("다양한 괄호를 제거해야 함", () => {
    expect(removeBrackets("『유이카』")).toBe("유이카");
    expect(removeBrackets("(테스트)")).toBe("테스트");
    expect(removeBrackets("【YOASOBI】")).toBe("YOASOBI");
  });

  it("괄호가 없으면 원본을 반환해야 함", () => {
    expect(removeBrackets("YOASOBI")).toBe("YOASOBI");
  });
});

describe("transformArtistToDocument", () => {
  it("아티스트 이름의 괄호 제거 버전이 q_name_*_a 필드에 포함되어야 함", () => {
    const artist = {
      id: 189,
      name: "『ユイカ』",
      nameKo: "『유이카』",
      aliases: [],
      // ...
    };

    const result = transformArtistToDocument(artist as any);

    // 원본 포함
    expect(result.q_name_ko_a).toContain("『유이카』");
    // 괄호 제거 버전 포함
    expect(result.q_name_ko_a).toContain("유이카");
  });
});
```

### 테스트 실행

```bash
pnpm test transformer
```

### 주의사항

- 새로운 문자열 처리 로직을 추가할 때는 **엣지 케이스**도 테스트해야 합니다.
  - 빈 문자열
  - null/undefined
  - 특수 문자만 있는 경우
  - 혼합된 문자 타입 (한자+가나, 한글+영어 등)

- 실제 데이터 기반 테스트를 작성하세요.
  - DB에 있는 실제 아티스트/곡 이름 사용
  - 실제로 발생했던 검색 실패 케이스 재현
