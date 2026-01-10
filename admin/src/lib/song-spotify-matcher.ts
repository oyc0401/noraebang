// song-spotify-matcher.ts

export type DebugMeta = {
  target: string;
  layer1_0_match: boolean; // 완전 일치
  layer1_5_match: boolean; // 공백 제거 후 완전 일치
  layer1_7_match: boolean; // 알파벳 소문자화 후 완전 일치
  layer1_8_match: boolean; // 알파벳 소문자화 + 공백 제거 후 완전 일치
  layer2_0_match: boolean; // prefix-safe
  layer3_s1: number; // partialSimilarity (with space)
  layer3_s2: number; // partialSimilarity (no space)
  layer3_score: number; // max(s1, s2)
  layer3_rank: number; // 순위 (1부터 시작)
  layer3_secondScore: number; // 2등 점수
  layer3_margin: number; // 1등과의 점수 차
};

export type BestMatchResult = {
  answer: string | null;
  candidate: string[];
  meta?: DebugMeta;
};

/**
 * Song–Spotify title matcher (test-driven).
 *
 * - answer: 확신 가능한 자동 확정 매칭. 없으면 null
 * - candidate: 점수 레이어(3.x)에서만 생성되는 "근접 후보" 목록
 * - debugTarget: 디버깅할 후보 문자열 (지정 시 meta에 상세 정보 포함)
 */
export function findBestMatch(
  query: string,
  candidates: string[],
  debugTarget?: string,
): BestMatchResult {
  if (!candidates.length) return { answer: null, candidate: [] };

  const meta: DebugMeta | undefined = debugTarget
    ? {
        target: debugTarget,
        layer1_0_match: false,
        layer1_5_match: false,
        layer1_7_match: false,
        layer1_8_match: false,
        layer2_0_match: false,
        layer3_s1: 0,
        layer3_s2: 0,
        layer3_score: 0,
        layer3_rank: 0,
        layer3_secondScore: 0,
        layer3_margin: 0,
      }
    : undefined;

  const qW = K10(query);
  const qS = K15(query);

  const qHasAsciiAlpha = /[A-Za-z]/.test(query);
  const qL = K17(query); // L(W(U(q)))
  const qLS = K18(query); // S(L(W(U(q))))
  const alphaGuard = qHasAsciiAlpha && qL.length >= 4;

  // -----------------------------
  // Layer 1.x / 2.0: answer 확정
  // -----------------------------
  let fixedAnswer: string | null = null;

  // 1.0: 완전 일치(공백 정규화만)
  {
    const idx = candidates.findIndex((c) => K10(c) === qW);
    if (idx >= 0) fixedAnswer = candidates[idx];
    if (meta && debugTarget) {
      meta.layer1_0_match = K10(debugTarget) === qW;
    }
  }

  // 1.5: 공백 제거 후 완전 일치
  if (!fixedAnswer) {
    const matches = candidates
      .map((c, i) => ({ c, i, k10: K10(c), k15: K15(c) }))
      .filter((x) => x.k15 === qS);

    if (meta && debugTarget) {
      meta.layer1_5_match = K15(debugTarget) === qS;
    }

    if (matches.length > 0) {
      // tie-break:
      // 1) W(U(c)) === W(U(q)) 인 원문 우선 (사실상 1.0에서 걸렸겠지만 안전)
      const exactWU = matches.find((x) => x.k10 === qW);
      if (exactWU) {
        fixedAnswer = exactWU.c;
      } else {
        // 2) W(U(c)) 길이 가장 짧은 것
        let best = matches[0];
        for (const m of matches) {
          if (m.k10.length < best.k10.length) best = m;
        }
        fixedAnswer = best.c;
      }
    }
  }

  // 1.7: 알파벳 소문자화 후 완전 일치 (가드)
  if (!fixedAnswer && alphaGuard) {
    const idx = candidates.findIndex((c) => K17(c) === qL);
    if (idx >= 0) fixedAnswer = candidates[idx];
    if (meta && debugTarget) {
      meta.layer1_7_match = K17(debugTarget) === qL;
    }
  }

  // 1.8: 알파벳 소문자화 + 공백 제거 후 완전 일치 (가드)
  if (!fixedAnswer && alphaGuard) {
    const idx = candidates.findIndex((c) => K18(c) === qLS);
    if (idx >= 0) fixedAnswer = candidates[idx];
    if (meta && debugTarget) {
      meta.layer1_8_match = K18(debugTarget) === qLS;
    }
  }

  // 2.0: prefix-safe(경계 기반 확정)
  if (!fixedAnswer) {
    const idx = candidates.findIndex((c) => isPrefixSafe(qW, K10(c)));
    if (idx >= 0) fixedAnswer = candidates[idx];
    if (meta && debugTarget) {
      meta.layer2_0_match = isPrefixSafe(qW, K10(debugTarget));
    }
  }

  // ---------------------------------
  // Layer 3.x: 점수 계산 + 후보 생성
  // - fixedAnswer가 있어도 후보 생성은 수행(단, answer는 덮어쓰지 않음)
  // ---------------------------------
  const T_ANSWER = 0.92;
  const T_MARGIN = 0.06;

  const T_CANDIDATE = 0.82;
  const WINDOW = 0.1;
  const R_MIN = 0.7;
  const MAX_CANDIDATES = 5;

  const qLen = qL.length;
  const qNoSpaceLen = qLS.length;

  // 점수 산출
  const scored = candidates.map((c, idx) => {
    const cL = K17(c);
    const cLS = K18(c);
    const s1 = partialSimilarity(qL, cL);
    const s2 = partialSimilarity(qLS, cLS);
    const score = Math.max(s1, s2);
    return { c, idx, cL, cLS, s1, s2, score };
  });

  const sorted = [...scored].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx; // stable by input order
  });

  const best = sorted[0];
  const secondScore = sorted.length >= 2 ? sorted[1].score : 0;

  // debugTarget의 점수 정보를 meta에 저장
  if (meta && debugTarget) {
    const targetItem = scored.find((item) => item.c === debugTarget);
    if (targetItem) {
      meta.layer3_s1 = targetItem.s1;
      meta.layer3_s2 = targetItem.s2;
      meta.layer3_score = targetItem.score;

      // 순위 계산 (1부터 시작)
      const rank = sorted.findIndex((item) => item.c === debugTarget);
      meta.layer3_rank = rank >= 0 ? rank + 1 : 0;

      meta.layer3_secondScore = secondScore;
      meta.layer3_margin = best.score - targetItem.score;
    }
  }

  // 3.1: answer 확정 (fixedAnswer 없을 때만, 그리고 짧은 query(<=2)는 금지)
  let answer = fixedAnswer;
  if (!answer && qLen > 2) {
    if (best.score >= T_ANSWER && best.score - secondScore >= T_MARGIN) {
      answer = best.c;
    }
  }

  // 3.2: candidate 생성
  const outCandidates: string[] = [];

  // 점수 레이어는 query가 비어있으면 의미 없음
  if (qLen > 0) {
    for (const item of sorted) {
      if (outCandidates.length >= MAX_CANDIDATES) break;
      if (answer && item.c === answer) continue;

      // best-window 컷 (정렬되어 있으니 컷이면 이후도 모두 컷)
      if (item.score < best.score - WINDOW) break;

      if (item.score < T_CANDIDATE) break;

      // 길이비 가드(긴 쿼리에서만 적용)
      if (qNoSpaceLen >= 4) {
        const cNoSpaceLen = item.cLS.length;
        const ratio =
          Math.min(qNoSpaceLen, cNoSpaceLen) /
          Math.max(qNoSpaceLen, cNoSpaceLen);
        if (ratio < R_MIN) continue;
      }

      // 단일 한자(예: 綺) 오탐 방지: "경계 없는 한자+한자" 결합은 후보에서 제외
      if (qLen === 1 && isHan(qL[0])) {
        if (!allowSingleHanCandidate(qL[0], item.c)) continue;
      }

      outCandidates.push(item.c);
    }
  }

  return { answer, candidate: outCandidates, meta };
}

// -----------------------------
// Normalization helpers
// -----------------------------
function U(s: string): string {
  return (s ?? "").normalize("NFKC");
}

function W(s: string): string {
  return U(s).replace(/\s+/gu, " ").trim();
}

function S(s: string): string {
  return s.replace(/\s+/gu, "");
}

/** ASCII 알파벳만 소문자화 */
function L(s: string): string {
  return s.replace(/[A-Z]/g, (ch) => ch.toLowerCase());
}

function K10(s: string): string {
  return W(s);
}

function K15(s: string): string {
  return S(W(s));
}

function K17(s: string): string {
  return L(W(s));
}

function K18(s: string): string {
  return S(L(W(s)));
}

// -----------------------------
// Layer 2.0: prefix-safe
// -----------------------------
const PREFIX_SAFE_BOUNDARIES = new Set<string>([
  " ", // 공백
  "(",
  "（",
  "[",
  "【",
  "{",
  "-",
  "–",
  "—",
  ":",
  "|",
  "/",
]);

function isPrefixSafe(qWU: string, cWU: string): boolean {
  if (!qWU) return false;
  if (!cWU.startsWith(qWU)) return false;
  if (cWU.length === qWU.length) return false; // 완전 일치는 1.0에서 처리

  const next = cWU[qWU.length] ?? "";
  return PREFIX_SAFE_BOUNDARIES.has(next);
}

// -----------------------------
// Weighted partial edit distance -> similarity
// dp[0][j]=0 으로 "candidate의 어떤 위치에서든 시작" 허용
// min_j dp[m][j] 를 사용해 query vs candidate substring 최소 비용
// -----------------------------
function partialSimilarity(q: string, c: string): number {
  const a = q;
  const b = c;

  const m = a.length;
  const n = b.length;

  if (m === 0 || n === 0) return 0;

  let prev = new Float64Array(n + 1);
  let curr = new Float64Array(n + 1);

  // dp[0][j] = 0 (어디서든 시작)
  for (let j = 0; j <= n; j++) prev[j] = 0;

  for (let i = 1; i <= m; i++) {
    const ai = a[i - 1];
    curr[0] = prev[0] + delCost(ai); // dp[i][0]

    for (let j = 1; j <= n; j++) {
      const bj = b[j - 1];

      const del = prev[j] + delCost(ai);
      const ins = curr[j - 1] + insCost(bj);
      const sub = prev[j - 1] + subCost(ai, bj);

      curr[j] = Math.min(del, ins, sub);
    }

    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  // min over dp[m][j]
  let minDist = prev[0];
  for (let j = 1; j <= n; j++) {
    if (prev[j] < minDist) minDist = prev[j];
  }

  // normalize by query length (max op cost를 1로 두고 단순 정규화)
  const denom = Math.max(1, m);
  const sim = 1 - minDist / denom;
  return sim <= 0 ? 0 : sim >= 1 ? 1 : sim;
}

function isSpace(ch: string): boolean {
  return /\s/u.test(ch);
}

function isPunctLike(ch: string): boolean {
  // 비교/삭제/삽입에서 "부가정보" 성격의 기호를 약하게 취급하기 위한 범위
  return /[()[\]{}【】（）「」『』〈〉《》“”‘’"'`~!@#$%^&*+=<>?,.;:|/\\_\-–—・：]/u.test(
    ch,
  );
}

function delCost(ch: string): number {
  if (isSpace(ch)) return 0.05;
  if (isPunctLike(ch)) return 0.3;
  return 1.0;
}

function insCost(ch: string): number {
  // 삽입/삭제 동일 취급
  return delCost(ch);
}

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  const aSpace = isSpace(a);
  const bSpace = isSpace(b);
  if (aSpace && bSpace) return 0.05;
  if (aSpace || bSpace) return 0.5;

  const aP = isPunctLike(a);
  const bP = isPunctLike(b);
  if (aP && bP) return 0.3;
  if (aP || bP) return 0.7;

  return 1.0;
}

// -----------------------------
// Single Han (1-char) candidate guard
// - "綺" 처럼 너무 짧은 한자 쿼리에서 "綺羅" 같은 결합을 후보로 올리지 않기 위함
// - 단, 숫자/공백/기호/반복/경계 포함은 허용(唱32, Other 唱, 唱唱… 등)
// -----------------------------
function isHan(ch: string): boolean {
  return /[\u3400-\u9FFF\uF900-\uFAFF]/u.test(ch);
}

function isBoundaryForSingleHan(ch: string): boolean {
  return isSpace(ch) || isPunctLike(ch) || PREFIX_SAFE_BOUNDARIES.has(ch);
}

function allowSingleHanCandidate(
  qChar: string,
  candidateOriginal: string,
): boolean {
  const s = K10(candidateOriginal); // W(U)
  const pos = s.indexOf(qChar);
  if (pos < 0) return false;

  const prev = pos > 0 ? s[pos - 1] : "";
  const next = pos + 1 < s.length ? s[pos + 1] : "";

  // 앞이 경계면 OK (예: "Other 唱")
  if (prev && isBoundaryForSingleHan(prev)) return true;

  // 뒤가 없으면 OK (사실상 동일 문자열)
  if (!next) return true;

  // 반복(唱唱…)
  if (next === qChar) return true;

  // 숫자(唱32)
  if (/[0-9]/.test(next)) return true;

  // 뒤가 경계면 OK (唱 - ..., 唱 [ ... )
  if (isBoundaryForSingleHan(next)) return true;

  // 그 외(특히 한자 결합: 綺羅)는 후보에서 제외
  return false;
}
