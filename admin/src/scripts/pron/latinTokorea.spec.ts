import { latinToKo, latinToKoCandidates } from "./latinTokorea";

// pnpm test latinTokorea.spec.ts

describe("latinToKo", () => {
  it('pretender를 "프리텐더"로 변환해야 함', () => {
    expect(latinToKo("pretender")).toBe("프리텐더");
  });

  it('hello를 "헬로"로 변환해야 함', () => {
    expect(latinToKo("hello")).toBe("헬로");
  });

  it('world를 "월드"로 변환해야 함', () => {
    expect(latinToKo("world")).toBe("월드");
  });

  it('love를 "러브"로 변환해야 함', () => {
    expect(latinToKo("love")).toBe("러브");
  });

  it('music를 "뮤직"으로 변환해야 함', () => {
    expect(latinToKo("music")).toBe("뮤직");
  });

  it('night를 "나이트"로 변환해야 함', () => {
    expect(latinToKo("night")).toBe("나이트");
  });

  it('forever를 "포에버"로 변환해야 함', () => {
    expect(latinToKo("forever")).toBe("포에버");
  });

  it('angel를 "엔젤"로 변환해야 함', () => {
    expect(latinToKo("angel")).toBe("엔젤");
  });

  it('memory를 "메모리"로 변환해야 함', () => {
    expect(latinToKo("memory")).toBe("메모리");
  });

  it('tomorrow를 "투모로우"로 변환해야 함', () => {
    expect(latinToKo("tomorrow")).toBe("투모로우");
  });

  it('yesterday를 "예스터데이"로 변환해야 함', () => {
    expect(latinToKo("yesterday")).toBe("예스터데이");
  });

  it('rainbow를 "레인보우"로 변환해야 함', () => {
    expect(latinToKo("rainbow")).toBe("레인보우");
  });

  it('chocolate를 "초콜릿"으로 변환해야 함', () => {
    expect(latinToKo("chocolate")).toBe("초콜릿");
  });

  it('camera를 "카메라"로 변환해야 함', () => {
    expect(latinToKo("camera")).toBe("카메라");
  });

  it('computer를 "컴퓨터"로 변환해야 함', () => {
    expect(latinToKo("computer")).toBe("컴퓨터");
  });

  it('database를 "데이터베이스"로 변환해야 함', () => {
    expect(latinToKo("database")).toBe("데이터베이스");
  });

  it('algorithm를 "알고리즘"으로 변환해야 함', () => {
    expect(latinToKo("algorithm")).toBe("알고리즘");
  });

  it('function를 "펑션"으로 변환해야 함', () => {
    expect(latinToKo("function")).toBe("펑션");
  });

  it('variable를 "배리어블"로 변환해야 함', () => {
    expect(latinToKo("variable")).toBe("배리어블");
  });

  it('version을 "버전"으로 변환해야 함', () => {
    expect(latinToKo("version")).toBe("버전");
  });

  it('remix를 "리믹스"로 변환해야 함', () => {
    expect(latinToKo("remix")).toBe("리믹스");
  });

  it('official를 "오피셜"로 변환해야 함', () => {
    expect(latinToKo("official")).toBe("오피셜");
  });

  it('beautiful를 "뷰티풀"로 변환해야 함', () => {
    expect(latinToKo("beautiful")).toBe("뷰티풀");
  });

  it('princess를 "프린세스"로 변환해야 함', () => {
    expect(latinToKo("princess")).toBe("프린세스");
  });

  it('dragon를 "드래곤"으로 변환해야 함', () => {
    expect(latinToKo("dragon")).toBe("드래곤");
  });

  it('tiger를 "타이거"로 변환해야 함', () => {
    expect(latinToKo("tiger")).toBe("타이거");
  });

  it('banana를 "바나나"로 변환해야 함', () => {
    expect(latinToKo("banana")).toBe("바나나");
  });

  it('strawberry를 "스트로베리"로 변환해야 함', () => {
    expect(latinToKo("strawberry")).toBe("스트로베리");
  });

  it('keyboard를 "키보드"로 변환해야 함', () => {
    expect(latinToKo("keyboard")).toBe("키보드");
  });

  it('internet를 "인터넷"으로 변환해야 함', () => {
    expect(latinToKo("internet")).toBe("인터넷");
  });

  it('server를 "서버"로 변환해야 함', () => {
    expect(latinToKo("server")).toBe("서버");
  });

  it('client를 "클라이언트"로 변환해야 함', () => {
    expect(latinToKo("client")).toBe("클라이언트");
  });

  it('cache를 "캐시"로 변환해야 함', () => {
    expect(latinToKo("cache")).toBe("캐시");
  });

  it('memory를 "메모리"로 변환해야 함', () => {
    expect(latinToKo("memory")).toBe("메모리");
  });

  it('system를 "시스템"으로 변환해야 함', () => {
    expect(latinToKo("system")).toBe("시스템");
  });

  it('signal를 "시그널"로 변환해야 함', () => {
    expect(latinToKo("signal")).toBe("시그널");
  });

  it('pattern를 "패턴"으로 변환해야 함', () => {
    expect(latinToKo("pattern")).toBe("패턴");
  });

  it('filter를 "필터"로 변환해야 함', () => {
    expect(latinToKo("filter")).toBe("필터");
  });

  it('ranking를 "랭킹"으로 변환해야 함', () => {
    expect(latinToKo("ranking")).toBe("랭킹");
  });

  it('precision를 "프리시전"으로 변환해야 함', () => {
    expect(latinToKo("precision")).toBe("프리시전");
  });

  it('recall를 "리콜"로 변환해야 함', () => {
    expect(latinToKo("recall")).toBe("리콜");
  });

  it('query를 "쿼리"로 변환해야 함', () => {
    expect(latinToKo("query")).toBe("쿼리");
  });

  it('result를 "리절트"로 변환해야 함', () => {
    expect(latinToKo("result")).toBe("리절트");
  });
});

describe("latinToKoCandidates", () => {
  it('pretender 후보에 "프리텐더"가 포함되어야 함', () => {
    const candidates = latinToKoCandidates("pretender", { limit: 5 });
    expect(candidates).toContain("프리텐더");
  });

  it("limit 옵션이 동작해야 함", () => {
    expect(latinToKoCandidates("pretender", { limit: 1 })).toHaveLength(1);
    expect(
      latinToKoCandidates("pretender", { limit: 3 }).length,
    ).toBeLessThanOrEqual(3);
  });

  it("중복 없이 후보가 반환되어야 함", () => {
    const cands = latinToKoCandidates("pretender", { limit: 20 });
    expect(new Set(cands).size).toBe(cands.length);
  });

  it("공백/대소문자/기호가 섞여도 동작해야 함", () => {
    const cands = latinToKoCandidates("  Pre-Tender!!  ", { limit: 10 });
    expect(cands.length).toBeGreaterThan(0);
    expect(cands).toContain("프리텐더");
  });

  const words = [
    "hello",
    "world",
    "love",
    "music",
    "night",
    "forever",
    "yesterday",
    "rainbow",
    "chocolate",
    "camera",
    "computer",
    "database",
    "algorithm",
    "version",
    "remix",
    "official",
    "beautiful",
    "princess",
    "dragon",
    "tiger",
    "banana",
    "strawberry",
    "keyboard",
    "internet",
    "server",
    "client",
    "cache",
    "system",
    "pattern",
    "filter",
    "ranking",
    "precision",
    "recall",
    "query",
    "result",
  ] as const;

  for (const w of words) {
    it(`${w} 후보가 최소 1개 이상 나와야 함`, () => {
      const cands = latinToKoCandidates(w, { limit: 5 });
      expect(cands.length).toBeGreaterThan(0);
    });
  }
});
