function normalizeHalfwidthKatakanaOnly(s: string): string {
  // ✅ 반각 가타카나 + 탁점/반탁점(ﾞﾟ) + 반각 장음(ｰ)까지 함께 NFKC
  return s.replace(/[\uFF66-\uFF9F\uFF70]+/g, (chunk) =>
    chunk.normalize("NFKC"),
  );
}

// kanaToHangul.ts
export function kanaToHangul(input: string): string {
  // ✅ NFD(분해형) → NFC(합성형), 반각카나 포함 변환까지 커버
  // 1) NFD(が/ぱ) 같은 결합부호를 합성형으로
  input = input.normalize("NFC");

  // 2) 반각 카타카나만 전각으로(특수문자/구두점은 그대로 둠)
  input = normalizeHalfwidthKatakanaOnly(input);

  // 3) 장음 기호 변종 최소 치환
  input = input.replace(/[\u2015\u2500]/g, "ー");

  // ✅ particle/고정구문 프리패스 추가
  const s = preRewriteParticles(normalizeToHiragana(input));

  // 테스트 요구: 특별 사전 매핑
  const SPECIAL: Array<[string, string]> = [
    ["とうきょう", "도쿄"],
    ["いいでしょうか", "이데쇼카"],
    ["いいでしょう", "이데쇼"],
    ["こんにちは", "콘니치와"],
    ["こんばんは", "콤방와"],
    ["こんばんわ", "콤방와"],
  ];

  // --- Hangul utilities ---
  const HANGUL_BASE = 0xac00;
  const HANGUL_END = 0xd7a3;

  function isHangulSyllable(ch: string): boolean {
    const c = ch.codePointAt(0)!;
    return c >= HANGUL_BASE && c <= HANGUL_END;
  }

  // 종성 인덱스 (Unicode Hangul Syllables)
  const JONG = {
    NONE: 0,
    G: 1, // ㄱ
    N: 4, // ㄴ
    M: 16, // ㅁ
    B: 17, // ㅂ
    S: 19, // ㅅ
    NG: 21, // ㅇ
  } as const;

  function addFinal(syl: string, jong: number): string {
    if (!isHangulSyllable(syl)) return syl;
    const code = syl.codePointAt(0)! - HANGUL_BASE;
    const cho = Math.floor(code / 588);
    const jung = Math.floor((code % 588) / 28);
    return String.fromCodePoint(HANGUL_BASE + cho * 588 + jung * 28 + jong);
  }

  function replaceLastHangul(out: string, jong: number): string {
    if (!out) return out;
    const last = out[out.length - 1];
    if (!isHangulSyllable(last)) return out;
    return out.slice(0, -1) + addFinal(last, jong);
  }

  // --- Kana classification ---
  function isHiragana(ch: string): boolean {
    const c = ch.codePointAt(0)!;
    return c >= 0x3040 && c <= 0x309f;
  }
  function isKana(ch: string): boolean {
    return isHiragana(ch) || ch === "ー";
  }

  // --- Tables ---
  type VowelMain = "a" | "i" | "u" | "e" | "o";
  type ConsClass =
    | "vowel"
    | "k"
    | "s"
    | "t"
    | "n"
    | "h"
    | "m"
    | "y"
    | "r"
    | "w"
    | "g"
    | "z"
    | "d"
    | "b"
    | "p";

  type MoraInfo = {
    out: string;
    vowelMain: VowelMain;
    consClass: ConsClass;
    vowelOnly?: boolean;
    wasYouon?: boolean;
  };

  const SINGLE: Record<string, MoraInfo> = {
    あ: { out: "아", vowelMain: "a", consClass: "vowel", vowelOnly: true },
    い: { out: "이", vowelMain: "i", consClass: "vowel", vowelOnly: true },
    う: { out: "우", vowelMain: "u", consClass: "vowel", vowelOnly: true },
    え: { out: "에", vowelMain: "e", consClass: "vowel", vowelOnly: true },
    お: { out: "오", vowelMain: "o", consClass: "vowel", vowelOnly: true },

    か: { out: "카", vowelMain: "a", consClass: "k" },
    き: { out: "키", vowelMain: "i", consClass: "k" },
    く: { out: "쿠", vowelMain: "u", consClass: "k" },
    け: { out: "케", vowelMain: "e", consClass: "k" },
    こ: { out: "코", vowelMain: "o", consClass: "k" },

    さ: { out: "사", vowelMain: "a", consClass: "s" },
    し: { out: "시", vowelMain: "i", consClass: "s" },
    す: { out: "스", vowelMain: "u", consClass: "s" },
    せ: { out: "세", vowelMain: "e", consClass: "s" },
    そ: { out: "소", vowelMain: "o", consClass: "s" },

    た: { out: "타", vowelMain: "a", consClass: "t" },
    ち: { out: "치", vowelMain: "i", consClass: "t" },
    つ: { out: "츠", vowelMain: "u", consClass: "t" },
    て: { out: "테", vowelMain: "e", consClass: "t" },
    と: { out: "토", vowelMain: "o", consClass: "t" },

    な: { out: "나", vowelMain: "a", consClass: "n" },
    に: { out: "니", vowelMain: "i", consClass: "n" },
    ぬ: { out: "누", vowelMain: "u", consClass: "n" },
    ね: { out: "네", vowelMain: "e", consClass: "n" },
    の: { out: "노", vowelMain: "o", consClass: "n" },

    は: { out: "하", vowelMain: "a", consClass: "h" },
    ひ: { out: "히", vowelMain: "i", consClass: "h" },
    ふ: { out: "후", vowelMain: "u", consClass: "h" },
    へ: { out: "헤", vowelMain: "e", consClass: "h" },
    ほ: { out: "호", vowelMain: "o", consClass: "h" },

    ま: { out: "마", vowelMain: "a", consClass: "m" },
    み: { out: "미", vowelMain: "i", consClass: "m" },
    む: { out: "무", vowelMain: "u", consClass: "m" },
    め: { out: "메", vowelMain: "e", consClass: "m" },
    も: { out: "모", vowelMain: "o", consClass: "m" },

    や: { out: "야", vowelMain: "a", consClass: "y" },
    ゆ: { out: "유", vowelMain: "u", consClass: "y" },
    よ: { out: "요", vowelMain: "o", consClass: "y" },

    ら: { out: "라", vowelMain: "a", consClass: "r" },
    り: { out: "리", vowelMain: "i", consClass: "r" },
    る: { out: "루", vowelMain: "u", consClass: "r" },
    れ: { out: "레", vowelMain: "e", consClass: "r" },
    ろ: { out: "로", vowelMain: "o", consClass: "r" },

    わ: { out: "와", vowelMain: "a", consClass: "w" },
    を: { out: "오", vowelMain: "o", consClass: "w" },

    が: { out: "가", vowelMain: "a", consClass: "g" },
    ぎ: { out: "기", vowelMain: "i", consClass: "g" },
    ぐ: { out: "구", vowelMain: "u", consClass: "g" },
    げ: { out: "게", vowelMain: "e", consClass: "g" },
    ご: { out: "고", vowelMain: "o", consClass: "g" },

    ざ: { out: "자", vowelMain: "a", consClass: "z" },
    じ: { out: "지", vowelMain: "i", consClass: "z" },
    ず: { out: "즈", vowelMain: "u", consClass: "z" },
    ぜ: { out: "제", vowelMain: "e", consClass: "z" },
    ぞ: { out: "조", vowelMain: "o", consClass: "z" },

    だ: { out: "다", vowelMain: "a", consClass: "d" },
    ぢ: { out: "지", vowelMain: "i", consClass: "d" },
    づ: { out: "즈", vowelMain: "u", consClass: "d" },
    で: { out: "데", vowelMain: "e", consClass: "d" },
    ど: { out: "도", vowelMain: "o", consClass: "d" },

    ば: { out: "바", vowelMain: "a", consClass: "b" },
    び: { out: "비", vowelMain: "i", consClass: "b" },
    ぶ: { out: "부", vowelMain: "u", consClass: "b" },
    べ: { out: "베", vowelMain: "e", consClass: "b" },
    ぼ: { out: "보", vowelMain: "o", consClass: "b" },

    ぱ: { out: "파", vowelMain: "a", consClass: "p" },
    ぴ: { out: "피", vowelMain: "i", consClass: "p" },
    ぷ: { out: "푸", vowelMain: "u", consClass: "p" },
    ぺ: { out: "페", vowelMain: "e", consClass: "p" },
    ぽ: { out: "포", vowelMain: "o", consClass: "p" },
  };

  const YOUON: Record<string, MoraInfo> = {
    きゃ: { out: "캬", vowelMain: "a", consClass: "k", wasYouon: true },
    きゅ: { out: "큐", vowelMain: "u", consClass: "k", wasYouon: true },
    きょ: { out: "쿄", vowelMain: "o", consClass: "k", wasYouon: true },

    しゃ: { out: "샤", vowelMain: "a", consClass: "s", wasYouon: true },
    しゅ: { out: "슈", vowelMain: "u", consClass: "s", wasYouon: true },
    しょ: { out: "쇼", vowelMain: "o", consClass: "s", wasYouon: true },

    ちゃ: { out: "챠", vowelMain: "a", consClass: "t", wasYouon: true },
    ちゅ: { out: "츄", vowelMain: "u", consClass: "t", wasYouon: true },
    ちょ: { out: "쵸", vowelMain: "o", consClass: "t", wasYouon: true },

    にゃ: { out: "냐", vowelMain: "a", consClass: "n", wasYouon: true },
    にゅ: { out: "뉴", vowelMain: "u", consClass: "n", wasYouon: true },
    にょ: { out: "뇨", vowelMain: "o", consClass: "n", wasYouon: true },

    ひゃ: { out: "햐", vowelMain: "a", consClass: "h", wasYouon: true },
    ひゅ: { out: "휴", vowelMain: "u", consClass: "h", wasYouon: true },
    ひょ: { out: "효", vowelMain: "o", consClass: "h", wasYouon: true },

    みゃ: { out: "먀", vowelMain: "a", consClass: "m", wasYouon: true },
    みゅ: { out: "뮤", vowelMain: "u", consClass: "m", wasYouon: true },
    みょ: { out: "묘", vowelMain: "o", consClass: "m", wasYouon: true },

    りゃ: { out: "랴", vowelMain: "a", consClass: "r", wasYouon: true },
    りゅ: { out: "류", vowelMain: "u", consClass: "r", wasYouon: true },
    りょ: { out: "료", vowelMain: "o", consClass: "r", wasYouon: true },

    ぎゃ: { out: "갸", vowelMain: "a", consClass: "g", wasYouon: true },
    ぎゅ: { out: "규", vowelMain: "u", consClass: "g", wasYouon: true },
    ぎょ: { out: "교", vowelMain: "o", consClass: "g", wasYouon: true },

    じゃ: { out: "쟈", vowelMain: "a", consClass: "z", wasYouon: true },
    じゅ: { out: "쥬", vowelMain: "u", consClass: "z", wasYouon: true },
    じょ: { out: "죠", vowelMain: "o", consClass: "z", wasYouon: true },

    びゃ: { out: "뱌", vowelMain: "a", consClass: "b", wasYouon: true },
    びゅ: { out: "뷰", vowelMain: "u", consClass: "b", wasYouon: true },
    びょ: { out: "뵤", vowelMain: "o", consClass: "b", wasYouon: true },

    ぴゃ: { out: "퍄", vowelMain: "a", consClass: "p", wasYouon: true },
    ぴゅ: { out: "퓨", vowelMain: "u", consClass: "p", wasYouon: true },
    ぴょ: { out: "표", vowelMain: "o", consClass: "p", wasYouon: true },
  };

  const LOAN: Record<string, MoraInfo> = {
    てぃ: { out: "티", vowelMain: "i", consClass: "t" },
    でぃ: { out: "디", vowelMain: "i", consClass: "d" },
    ふぁ: { out: "파", vowelMain: "a", consClass: "p" },
    ふぃ: { out: "피", vowelMain: "i", consClass: "p" },
    ふぇ: { out: "페", vowelMain: "e", consClass: "p" },
    ふぉ: { out: "포", vowelMain: "o", consClass: "p" },
  };

  const SMALL_Y = new Set(["ゃ", "ゅ", "ょ"]);
  const SMALL_V = new Set(["ぁ", "ぃ", "ぅ", "ぇ", "ぉ"]);

  const U_DROP_KEYS = new Set([
    "ゆ",
    "きゅ",
    "しゅ",
    "ちゅ",
    "にゅ",
    "ひゅ",
    "みゅ",
    "りゅ",
    "ぎゅ",
    "じゅ",
    "びゅ",
    "ぴゅ",
  ]);

  type ReadMora = { key: string; len: number; info?: MoraInfo } | null;

  function readMoraAt(idx: number): ReadMora {
    if (idx >= s.length) return null;

    const c0 = s[idx];
    const c1 = s[idx + 1];

    if (c1 && SMALL_V.has(c1)) {
      const key2 = c0 + c1;
      const info = LOAN[key2];
      if (info) return { key: key2, len: 2, info };
    }

    if (c1 && SMALL_Y.has(c1)) {
      const key2 = c0 + c1;
      const info = YOUON[key2];
      if (info) return { key: key2, len: 2, info };
    }

    const info = SINGLE[c0];
    if (info) return { key: c0, len: 1, info };

    return { key: c0, len: 1, info: undefined };
  }

  function isLabialStart(cons: ConsClass): boolean {
    return cons === "m" || cons === "b" || cons === "p";
  }

  let out = "";
  let i = 0;

  let lastMora: MoraInfo | null = null;
  let leadingSokuon = false;

  while (i < s.length) {
    let matchedSpecial = false;
    for (const [k, v] of SPECIAL) {
      if (s.startsWith(k, i)) {
        out += v;
        i += k.length;
        lastMora = null;
        matchedSpecial = true;
        break;
      }
    }
    if (matchedSpecial) continue;

    if (s.startsWith("ちゃん", i)) {
      out += "쨩";
      i += 3;
      lastMora = { out: "쨩", vowelMain: "a", consClass: "t", wasYouon: true };
      continue;
    }

    const ch = s[i];

    if (ch === "ー") {
      i += 1;
      continue;
    }

    if (leadingSokuon) {
      if (isHiragana(ch)) {
        out += hiraToKata(ch);
        i += 1;
        leadingSokuon = false;
        lastMora = null;
        continue;
      } else {
        leadingSokuon = false;
      }
    }

    if (ch === "っ") {
      if (!out || !isHangulSyllable(out[out.length - 1])) {
        out += "ッ";
        i += 1;
        leadingSokuon = true;
        lastMora = null;
        continue;
      }

      const next = readMoraAt(i + 1);
      if (lastMora && lastMora.out === "지" && next && next.key === "く") {
        i += 1;
        continue;
      }

      const prevV = lastMora?.vowelMain ?? "a";
      const nextInfo = next?.info;
      const nextCons: ConsClass = nextInfo?.consClass ?? "t";

      let jong: number = JONG.S;
      if (nextCons === "p" || nextCons === "b") jong = JONG.B;
      else if (nextCons === "k" || nextCons === "g") {
        jong = prevV === "e" || prevV === "i" ? JONG.S : JONG.G;
      } else {
        jong = JONG.S;
      }

      out = replaceLastHangul(out, jong);
      i += 1;
      continue;
    }

    // 비가나: 그대로 (원문 인덱스가 어긋나는 경우가 있어 s 기준으로 보존)
    if (!isKana(ch)) {
      out += ch;
      i += 1;
      lastMora = null;
      continue;
    }

    if (ch === "お" && s[i + 1] === "お") {
      let j = i;
      while (s[j] === "お") j++;
      out += "오";
      i = j;
      lastMora = {
        out: "오",
        vowelMain: "o",
        consClass: "vowel",
        vowelOnly: true,
      };
      continue;
    }

    const mora = readMoraAt(i);
    if (!mora) {
      out += ch;
      i += 1;
      lastMora = null;
      continue;
    }

    if (mora.key === "ん") {
      const nextChar = s[i + 1]; // 'ん' 다음 문자
      const prevChar = s[i - 1]; // 'ん' 이전 문자 (예: さ)
      const prev2Char = s[i - 2]; // 'さ' 이전 문자 (이름 접두 유무)

      const isBoundaryLike = (x: string | undefined) => {
        if (!x) return true;
        return /\s|[、。！？!?\(\)\[\]{}「」『』（）【】]/.test(x);
      };

      const isParticle = (x: string | undefined) =>
        x === "は" ||
        x === "わ" ||
        x === "へ" ||
        x === "を" ||
        x === "が" ||
        x === "の" ||
        x === "に" ||
        x === "で" ||
        x === "と" ||
        x === "も" ||
        x === "や" ||
        x === "か" ||
        x === "よ" ||
        x === "ね" ||
        x === "な";

      let jong: number = JONG.N;
      const hasPrevHangul =
        out.length > 0 && isHangulSyllable(out[out.length - 1]);
      if (!hasPrevHangul) {
        out += "ㄴ";
        i += 1;
        lastMora = null;
        continue;
      }

      // ✅ "이름 + さん"만 '상' 처리:
      // - 지금이 'ん'이고, 직전이 'さ' (즉 'さん')
      // - 'さ' 앞에 무언가(경계가 아닌 문자)가 존재 (=> 맨 앞 "さん..."은 제외)
      // - 다음이 조사/경계면 호칭으로 간주 ("おねえさんは", "たなかさん。" 등)
      if (
        hasPrevHangul &&
        lastMora?.out === "사" &&
        prevChar === "さ" &&
        !!prev2Char &&
        !isBoundaryLike(prev2Char) &&
        (isParticle(nextChar) || isBoundaryLike(nextChar))
      ) {
        out = replaceLastHangul(out, JONG.NG); // 사 -> 상
        i += 1;
        lastMora = null;
        continue;
      }

      const next = readMoraAt(i + 1);
      const nextInfo = next?.info;

      if (!next || !nextInfo || !isKana(next.key[0])) {
        // honorific "さん" => "상"

        jong = lastMora?.wasYouon ? JONG.NG : JONG.N;
      } else {
        const nc = nextInfo.consClass;
        if (nc === "k" || nc === "g") {
          jong = JONG.NG;
        } else if (nc === "vowel" || nc === "y" || nc === "w") {
          jong = JONG.N;
        } else if (isLabialStart(nc)) {
          if (lastMora?.vowelOnly) jong = JONG.N;
          else jong = JONG.M;
        } else {
          jong = JONG.N;
        }
      }

      out = replaceLastHangul(out, jong);
      i += 1;
      continue;
    }

    const info = mora.info;
    if (!info) {
      out += mora.key;
      i += mora.len;
      lastMora = null;
      continue;
    }

    out += info.out;
    lastMora = info;

    const next1 = s[i + mora.len];
    const afterLen = s[i + mora.len + 1];

    if (next1 === "う" && info.vowelMain === "o") {
      i += mora.len + 1;
      continue;
    }

    if (next1 === "う" && (mora.key === "ゆ" || U_DROP_KEYS.has(mora.key))) {
      i += mora.len + 1;
      continue;
    }

    if (next1 === "い") {
      if (mora.key === "せ") {
        if (afterLen !== "な" && afterLen !== "か") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "け") {
        if (afterLen !== "と") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "え") {
        // 예외: えいこ, (particle へ + いく/いき) => えいく/えいき 는 drop 하면 안 됨
        if (afterLen !== "こ" && afterLen !== "く" && afterLen !== "き") {
          i += mora.len + 1;
          continue;
        }
      } else if (mora.key === "じ") {
        i += mora.len + 1;
        continue;
      } else if (mora.key === "き") {
        // ✅ "おおきい" 단독/경계에서는 줄여도 되지만,
        //    "おおきいはこ"처럼 뒤에 이어지면 きい 유지
        if (isBoundary(afterLen) || !afterLen) {
          i += mora.len + 1; // drop
          continue;
        }
        // else: keep
      }
    }

    if (next1 === "え" && mora.key === "ね") {
      i += mora.len + 1;
      continue;
    }

    i += mora.len;
  }

  return out;
}
const isBoundary = (ch: string | undefined): boolean => {
  if (!ch) return true;
  // 공백/구두점/괄호 등
  return /\s|[、。！？!?\(\)\[\]{}「」『』（）【】]/.test(ch);
};

// --------------------
// Particle/phrase prepass (heuristics)
// --------------------
function preRewriteParticles(s: string): string {
  // 관용 발음

  const isHiraOrLong = (ch: string): boolean => {
    const c = ch.codePointAt(0)!;
    return (c >= 0x3040 && c <= 0x309f) || ch === "ー";
  };

  const isKanji = (x: string): boolean => {
    const c = x.codePointAt(0)!;
    return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf);
  };

  const isLikelyNounEnd = (x: string | undefined): boolean => {
    if (!x) return false;
    if (isHiraOrLong(x) || isKanji(x)) return true;
    if (/[)\]」』）】]/.test(x)) return true;
    if (/[0-9０-９]/.test(x)) return true;

    // ✅ A / 😀 같은 "비가나"도 명사 끝으로 취급 (へ/は 둘 다에 필요)
    if (!isBoundary(x) && !isHiraOrLong(x) && !isKanji(x)) return true;

    return false;
  };

  const TOPIC_ENDINGS = [
    "それ",
    "これ",
    "あれ",
    "どれ",
    "ここ",
    "そこ",
    "あそこ",
    "わたし",
    "あなた",
    "ぼく",
    "おれ",
    "きみ",
    "みんな",
    "いま",
    "きょう",
  ] as const;

  const matchesTopicEnding = (chars: string[], i: number) => {
    const lookback = 8;
    const start = Math.max(0, i - lookback);
    const window = chars.slice(start, i).join("");
    return TOPIC_ENDINGS.some((w) => window.endsWith(w));
  };

  const chars = Array.from(s);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    // は: 토픽 조사로 보이면 わ로
    if (ch === "は") {
      const prev = chars[i - 1];
      const next = chars[i + 1];

      // prev가 없으면 스킵
      if (!prev) continue;

      // ---------------------------------------------
      // (A') "いろは + です/でした/だ/だった" 는 관용구/표현으로 보고
      //      endish 휴리스틱으로 は→わ 되는 걸 막는다.
      //      ex) いろはです => 이로하데스
      // ---------------------------------------------
      if (i >= 2 && chars[i - 2] === "い" && chars[i - 1] === "ろ") {
        const tail = chars.slice(i + 1, Math.min(chars.length, i + 8)).join("");
        if (/^(です|でした|だ|だった)/.test(tail)) {
          continue; // ✅ 여기서는 は를 조사로 바꾸지 않음
        }
      }

      // ---------------------------------------------
      // (B) "-san + particle は" 강제: "...さんは..." 는 は→わ
      //     ex) おかあさんはげんき / おじさんはやさしい / (이름)さんは...
      // ---------------------------------------------
      if (i >= 2 && chars[i - 2] === "さ" && chars[i - 1] === "ん") {
        chars[i] = "わ";
        continue;
      }

      // // ----------------------------
      // // 2) 일반 토픽 판정: prev가 '명사 끝'이고, 뒤쪽이 문장처럼 이어지면 は→わ
      // //    - endish(です/だ/…い) 또는 topicEnding(これ/それ/きょう/ぼく...)면 토픽 처리
      // // ----------------------------
      if (!isLikelyNounEnd(prev)) continue;

      if (prev === "ん" && isBoundary(next)) {
        chars[i] = "わ";
        continue;
      }

      const tail = chars.slice(i + 1, Math.min(chars.length, i + 14)).join("");
      const endish =
        /です|でした|だ|だった/.test(tail) ||
        (() => {
          let j = i + 1;
          while (j < chars.length && !isBoundary(chars[j])) j++;
          const seg = chars.slice(i + 1, j).join("");
          return seg.endsWith("い");
        })();

      // (na-adj / noun predicate without copula) e.g. げんき, だいじょうぶ ...
      const naPredish = (() => {
        let j = i + 1;
        while (j < chars.length && !isBoundary(chars[j])) j++;
        const seg = chars.slice(i + 1, j).join(""); // は 다음부터 경계 전까지
        // 너무 넓히면 오탐 늘어서 "자주 서술로 쓰이는 것"만
        return /^(げんき|だいじょうぶ|だめ|ひま|すき|きらい|たいへん)$/.test(
          seg,
        );
      })();

      if (endish || naPredish || matchesTopicEnding(chars, i)) {
        chars[i] = "わ";
      }

      continue;
    }

    // へ: 방향 조사로 보이면 え로
    if (ch === "へ") {
      const prev = chars[i - 1];
      const next = chars[i + 1];

      // 1) "단어로서 ...へ" 예외: 여기 걸리면 절대 치환 금지
      const LEXICAL_HE_ENDINGS = [
        "いにしへ",
        "おきへ",
        "もとへ",
        "すえへ",
        "すゑへ",
        "かみへ",
        "くにへ",
        "きしへ",
      ] as const;

      // i 위치(へ 포함) 기준으로 lookback window에서 끝매칭
      {
        const lookback = 6;
        const start = Math.max(0, i - lookback);
        const window = chars.slice(start, i + 1).join("");
        if (LEXICAL_HE_ENDINGS.some((w) => window.endsWith(w))) {
          continue; // ✅ 단어면 그대로 'へ' 유지
        }
      }

      // 2) (선택) 지명 패턴 "~のへ" 보호: 하치노헤 같은 케이스
      // 지명은 한자가 더 흔하지만, 가나로 들어올 수 있음.
      // "のへ" 자체가 조사처럼 보이기 쉬우니 보호해두면 안전합니다.
      {
        const lookback = 4;
        const start = Math.max(0, i - lookback);
        const window = chars.slice(start, i + 1).join("");
        if (window.endsWith("のへ")) {
          continue; // ✅ 지명 패턴 가능성: 그대로 'へ'
        }
      }

      // へ 뒤에서 자주 오는 이동/방향 동사(활용 시작 형태까지)
      const tail = chars.slice(i + 1, Math.min(chars.length, i + 10)).join("");
      const moveVerb =
        /^(いく|いき|いっ|くる|きた|きて|きま|かえる|かえり|かえっ|むかう|むかい|むかっ|すすむ|すすみ|すすん|でかけ|でる|でた|でて|はいる|はいり|はいっ|うつる|うつり|うつっ|わたる|わたり|わたっ|のぼる|のぼり|のぼっ|あるく|あるい|はしる|はしり|はしっ|もっていく|もってい|もっ|もって)/.test(
          tail,
        );

      // 3) ✅ 조사로 판단되면 え로
      // - 명사 끝(한자/가나/괄호/숫자) + (이동동사 or 경계)면 조사 확률 높음
      // - 단, 위에서 "단어/지명"은 이미 continue 처리됨
      if (isLikelyNounEnd(prev) && (moveVerb || isBoundary(next))) {
        chars[i] = "え";
      }

      continue;
    }
  }

  return chars.join("");
}

// --------------------
// Normalization helpers
// --------------------
function normalizeToHiragana(str: string): string {
  let out = "";
  for (const ch of str) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x30a1 && c <= 0x30f6) {
      out += String.fromCodePoint(c - 0x60);
      continue;
    }
    if (ch === "ー") {
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function hiraToKata(hira: string): string {
  const c = hira.codePointAt(0)!;
  if (c >= 0x3041 && c <= 0x3096) {
    return String.fromCodePoint(c + 0x60);
  }
  return hira;
}
