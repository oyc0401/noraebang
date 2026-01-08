# 노래방 번호 검색(일본곡 한국어 검색) – Typesense 인덱싱 README

> 목표: **일본곡을 한국어로 검색**해서 곡을 찾고, 결과에서 **TJ/금영 노래방 번호를 보여주는** 검색을 만든다.
> 포인트: **번호로 번호를 검색하는 일은 없음.** (번호는 “표시 데이터”)

---

## 0) 큰 그림 (DB → Typesense)

* DB는 원천(Source of Truth)으로 둔다.
* DB의 `SongAlias`들로부터 Typesense용 `q_*` 필드(검색 토큰)를 “가공 생성”한다.
* **필드 티어는 4단계**로 운영한다.

### 티어 정의 (이거 고정)

### P(Primary)

SPOTIFY 공식 표기

titleor titleKo (한국어/영어/일본어 구분해서 넣기. title이 영어면 영어의 primary에만 추가.) 

primary의 괄호제거 버전도 넣기. ("『ユイカ』"와 "ユイカ" 둘 다 primary에 넣기.)


**KO는 필수**

KO가 없으면: **SPOTIFY 이름을 KO로 romanization(예: `YOASOBI → 요아소비`)** 해서 채우고, **어드민 1회 검증 후 P로 확정**


### A(Alias) 사람이 실제로 칠 만한 신뢰도 높은 대체 입력
  - primary norm (경량 정규화: 공백 제거 / 대소문자 / 히라↔가타)
  - YouTube 공식표기
  - **어드민 승인 nickname**
  - **TJ 토큰**(중요: “원문 크레딧 문자열” 자체가 아니라 **토큰화된 것만**)


### A2(Alias2)

AI 전용

###  F(Fuzzy) 오타/실수 전용(초기엔 비움)

  * 유저 데이터 모이기 전에는 **F를 안 쓰는 게 정답**
  * `밤달`, `요루니카케루` 같은 건 오타가 아니라 “의도된 입력”이므로 **A에 둔다**



---

## 1) DB 원천 스키마 (SongAlias)

String 유지로 간다(나중에 enum 귀찮음). 값 검증은 풀스캔으로 잡는다 OK.

```prisma
model SongAlias {
  id        Int      @id @default(autoincrement())
  songId    Int      @map("song_id")
  alias     String
  locale    String // "KO", "JA_KANA", "JA_KANJI", "LATIN"
  kind      String // "SPOTIFY", "YOUTUBE", "ROMANIZATION", "TRANSLATION", "TJ_NAME", "NICKNAME"
  source    String // "OPERATOR", "SYSTEM", "AI", "AUTO"

  createdAt DateTime @default(now()) @map("created_at")

  song Song @relation(fields: [songId], references: [id], onDelete: Cascade)

  @@unique([songId, alias, locale, kind])
  @@index([alias])
  @@map("song_alias")
}
```

* `@@unique([songId, alias, locale, kind])`로 중복 방지.
* `songId` 인덱스는 “없어도 돌아가는데” 상황 따라 나중에 추가하면 됨. (지금은 OK)

---

## 2) Typesense 문서 설계 핵심

### 2-1) KO 필수 / JA·LATIN 옵션

* **KO는 반드시 채운다.**
* JA_KANA, JA_KANJI, LATIN은 있으면 넣고 없으면 비워도 됨.

### 2-2) 일본어는 “가타/히라 나누지 않음”

* **JA_KANA 한 필드에 히라 + 가타를 같이 둔다.**
* “가타를 전부 히라로 통일” 같은 파괴적 변환은 금지(표기 차이/구분 힌트 날아감)
* 대신:

  * `JA_KANA_P`에 대표 1개(보통 히라)
  * `JA_KANA_A`에 반대 표기 1개(가타)

### 2-3) JA_KANJI는 “한자만”이 아니라 **원문 표면형(surface)**

* `夜に駆ける`처럼 **한자+히라 섞인 표기**는 **JA_KANJI 쪽**에 둔다.
* 카나만 있는 표기는 JA_KANA.

### 2-4) `q_norm` 필드 같은 “통합 노말라이즈”는 안 쓴다

* 필드별로 P/A/A2/F로만 관리하면 충분.
* 쓸데없는 중복 토큰이 검색을 망침.

---

## 3) 노래방 번호 처리(중요)

* **번호로 번호를 검색하지 않는다.**
* 그래서 번호는 Typesense에서 **검색 필드(q_*)에 절대 넣지 않는다.**
* 문서에는 그냥 표시용으로 저장만 한다:

```json
"karaokeNosTj": ["12345"],
"karaokeNosKy": []
```

(Typesense 스키마에서는 이 필드들 `index:false`로 두면 깔끔)

---

## 4) `q_combo_a`는 뭐고 왜 있냐

### 존재 이유

* 유저가 **곡+가수**를 공백 없이 붙여서 치는 케이스 구제용.

  * 예: `밤을달리다요아소비`

### 넣는 양

* **문서당 1~2개만** 넣는다.
* `"밤을달리다요아소비"`는 넣어도 됨.
* `"요아소비밤을달리다"` 같은 역방향은 **로그로 비율 확인 전에는 넣지 않는다.**
* 조합 폭발(노이즈/랭킹 흔들림) 방지 목적.

---

## 5) TJ_NAME 처리 (진짜 중요)

TJ_NAME은 `"IU(아이유),지드래곤(G-Dragon)"` 같은 **크레딧 포맷**이라 그대로 검색 토큰에 넣으면 검색이 오염됨.

### 정답 규칙

* DB에는 원문(TJ_NAME) 저장 OK
* Typesense에는 **토큰화된 값만 A로 넣는다**

  * `IU(아이유),지드래곤(G-Dragon)` →

    * KO 토큰: `아이유`, `지드래곤`
    * LATIN 토큰: `IU`, `G-Dragon`, `gdragon`(compact 1개만)

### 특수문자 처리 원리(파서 룰)

* `, / & + × feat/ft/with` 등은 분리 기준(split)
* 괄호는 제거하되 “밖/안” 토큰 둘 다 살림: `IU(아이유)` → `IU`, `아이유`
* 라틴 하이픈/공백은 compact 1개만 추가: `G-Dragon` → `gdragon`
* 원문 전체 문자열은 q_*에 넣지 않음

---

## 6) Fuzzy(F) 운영 룰

* 유저 데이터 모이기 전에는 **F를 비우는 게 정답.**
* F는 “오타/실수” 전용.
* `밤달`, `요루니카케루`는 **의도된 약칭/음차**라서 **A**에 둔다.
* 나중에 로그로 “진짜 자주 나는 오타”만 곡당 0~2개 제한으로 추가.

---

## 7) 정렬/랭킹 피처

### `popularity`

* 곡 인기도 점수(예: Spotify track popularity 0~100).
* 동명이곡/근접 매치에서 **타이브레이커**로 쓰기 좋음.
* 아티스트 인기도보다 **곡 인기도 우선**이 기본 정답.

### `mainArtistScore`

* 이 곡에서 해당 아티스트가 “메인”인 정도(0~1 느낌).
* 아티스트 검색에서 메인곡 우선시키고 싶을 때 유용.

### Typesense 내부 정렬이 유의미한 이유

* 내부에서 `sort_by`로 정렬해야 **페이지네이션이 안정적**이고 진짜 Top-K가 나옴.
* 외부 정렬은 개인화/복잡 룰이 필요할 때만 **Top-K 재정렬(rerank)** 용도로.

추천 기본 정렬:

* `sort_by=_text_match:desc,popularity:desc,updatedAt:desc`

---

## 9) A2(Alias2) 넣는 방식

* A2는 **AI nickname**을 담는다.
* 추천 운영:

  * **1차 검색**: P + A만
  * **0 hit일 때만 2차 검색**: P + A + A2
* 이렇게 해야 AI 별칭이 평소 랭킹을 안 흔듦.
