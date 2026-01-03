export interface ParsedArtists {
  artist: string[];
  feature: string[];
  producer: string[];
}

// 특정 그룹들은 괄호 안 멤버 목록을 제거하고 그룹명만 유지한다.
const GROUPS_WITH_MEMBER_LIST = new Set(["BTOB", "TWICE"]);

type ParenthesisType = "feature" | "producer" | "both";

interface ParenthesisExtraction {
  cleaned: string;
  features: string[];
  producers: string[];
}

export function parseTJArtist(tjArtist: string): ParsedArtists {
  const result: ParsedArtists = {
    artist: [],
    feature: [],
    producer: [],
  };

  if (!tjArtist || tjArtist.trim() === "") {
    return result;
  }

  let remaining = tjArtist.trim();
  const features: string[] = [];
  const producers: string[] = [];

  const extraction = extractParenthesisSegments(remaining);
  remaining = extraction.cleaned;
  features.push(...extraction.features);
  producers.push(...extraction.producers);

  const artistCandidates = splitNames(remaining);
  result.artist.push(
    ...artistCandidates
      .map(cleanupArtistName)
      .filter((name) => name.length > 0),
  );
  result.feature.push(...features);
  result.producer.push(...producers);

  return result;
}

function extractParenthesisSegments(text: string): ParenthesisExtraction {
  const features: string[] = [];
  const producers: string[] = [];
  let cleaned = "";

  for (let i = 0; i < text.length; ) {
    if (text[i] !== "(") {
      cleaned += text[i];
      i++;
      continue;
    }

    const segment = readBalancedSegment(text, i);
    if (!segment) {
      const remainder = text.slice(i + 1);
      const fallback = classifyParenthesisContent(remainder);
      if (fallback && fallback.names.length > 0) {
        if (fallback.type === "feature") {
          features.push(...fallback.names);
        } else if (fallback.type === "producer") {
          producers.push(...fallback.names);
        } else {
          features.push(...fallback.names);
          producers.push(...fallback.names);
        }
      } else {
        cleaned += text.slice(i);
      }
      break;
    }

    const classification = classifyParenthesisContent(segment.content);
    if (!classification) {
      cleaned += "(" + segment.content + ")";
    } else if (classification.names.length > 0) {
      if (classification.type === "feature") {
        features.push(...classification.names);
      } else if (classification.type === "producer") {
        producers.push(...classification.names);
      } else {
        features.push(...classification.names);
        producers.push(...classification.names);
      }
    }

    i = segment.end + 1;
  }

  return {
    cleaned: cleaned.trim(),
    features,
    producers,
  };
}

function classifyParenthesisContent(
  rawContent: string,
): { type: ParenthesisType; names: string[] } | null {
  const trimmed = rawContent.trim();
  if (trimmed === "") {
    return null;
  }

  const handlers: Array<{ regex: RegExp; type: ParenthesisType }> = [
    { regex: /^prod(?:[.,]|\b)\s*&\s*feat(?:uring)?[.,]?\s*/i, type: "both" },
    { regex: /^feat(?:uring)?[.,]?\s*&\s*prod(?:[.,]|\b)\s*/i, type: "both" },
    { regex: /^produced\s+by\s+/i, type: "producer" },
    { regex: /^prod(?:[.,]|\b)\s*(?:by\s+)?/i, type: "producer" },
    { regex: /^feat(?:uring)?[.,]?\s*/i, type: "feature" },
    { regex: /^duet\s+with\s*/i, type: "feature" },
    { regex: /^duet\.?\s*/i, type: "feature" },
    { regex: /^with\.?\s*/i, type: "feature" },
    { regex: /^rap\.?\s*/i, type: "feature" },
    { regex: /^narr\.?\s*/i, type: "feature" },
    { regex: /^special\s+ment\.?\s*/i, type: "feature" },
    { regex: /^sung\s+by\s+/i, type: "feature" },
    { regex: /^by\s+/i, type: "feature" },
  ];

  for (const handler of handlers) {
    const match = trimmed.match(handler.regex);
    if (match) {
      const names = splitNames(trimmed.slice(match[0].length));
      return names.length
        ? { type: handler.type, names }
        : { type: handler.type, names: [] };
    }
  }

  return null;
}

function splitNames(text: string): string[] {
  const results: string[] = [];
  const lower = text.toLowerCase();
  const connectors = ["with", "meets"];
  let depth = 0;
  let current = "";
  let i = 0;

  while (i < text.length) {
    if (depth === 0) {
      const connector = connectors.find((conn) => lower.startsWith(conn, i));
      if (connector) {
        const prevChar = i > 0 ? lower[i - 1] : "";
        const nextChar =
          i + connector.length < text.length
            ? lower[i + connector.length]
            : "";
        if (!/[a-z]/.test(prevChar) && !/[a-z]/.test(nextChar)) {
          const trimmed = current.trim();
          if (trimmed.length > 0) {
            results.push(trimmed);
          }
          current = "";
          i += connector.length;
          while (i < text.length && /[\s.,]/.test(text[i])) {
            i++;
          }
          continue;
        }
      }
    }

    const char = text[i];
    if (char === "(") {
      depth++;
      current += char;
      i++;
      continue;
    }
    if (char === ")") {
      if (depth > 0) {
        depth--;
      }
      current += char;
      i++;
      continue;
    }

    if (
      depth === 0 &&
      (char === "," || char === "&" || char === "＆" || char === "×")
    ) {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        results.push(trimmed);
      }
      current = "";
      i++;
      continue;
    }

    current += char;
    i++;
  }

  const finalValue = current.trim();
  if (finalValue.length > 0) {
    results.push(finalValue);
  }

  return results;
}

function cleanupArtistName(name: string): string {
  let cleaned = name.trim();
  if (!cleaned) {
    return "";
  }

  cleaned = cleaned.replace(/\s*외\s*(?:다수|\d+명)\s*$/i, "").trim();

  let output = "";
  for (let i = 0; i < cleaned.length; ) {
    if (cleaned[i] !== "(") {
      output += cleaned[i];
      i++;
      continue;
    }

    const segment = readBalancedSegment(cleaned, i);
    if (!segment) {
      output += cleaned.slice(i);
      break;
    }

    const content = segment.content.trim();
    const base = output.trim();
    const removeMemberList =
      GROUPS_WITH_MEMBER_LIST.has(base.toUpperCase()) && /,/.test(content);
    const remove =
      /[&×]/.test(content) || /\bsolo\b/i.test(content) || removeMemberList;

    if (!remove) {
      output += "(" + segment.content + ")";
    }

    i = segment.end + 1;
  }

  return output.trim();
}

function readBalancedSegment(
  text: string,
  startIndex: number,
): { content: string; end: number } | null {
  if (text[startIndex] !== "(") {
    return null;
  }

  let depth = 0;
  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];
    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth === 0) {
        return {
          content: text.slice(startIndex + 1, i),
          end: i,
        };
      }
    }
  }

  return null;
}
