import { removeBrackets } from "../../typesense/lib/text-utils";

const FEAT_PATTERN_IN_BRACKETS =
  /\((?:feat\.?|featuring|ft\.?)\s*[^)]*\)/gi;
const FEAT_PATTERN_INLINE =
  /\b(?:feat\.?|featuring|ft\.?)\s*[^\s\/・、]+/gi;
const BRACKET_WITH_CONTENT_PATTERN = /[【「\[()（]([^】」\])）]*)[】」\])）]/g;
const SEPARATOR_PATTERN = /[\/・_,、|]+/g;
const SUFFIX_PATTERN = /\s*MV$/i;

export function sanitizeSearchText(value?: string | null): string {
  if (!value) {
    return "";
  }

  const normalized = value.normalize("NFKC");
  const withoutFeatBrackets = normalized.replace(
    FEAT_PATTERN_IN_BRACKETS,
    " ",
  );

  let cleaned = withoutFeatBrackets.replace(BRACKET_WITH_CONTENT_PATTERN, " ");
  cleaned = removeBrackets(cleaned);
  cleaned = cleaned.replace(FEAT_PATTERN_INLINE, " ");
  cleaned = cleaned.replace(SEPARATOR_PATTERN, " ");
  cleaned = cleaned.replace(SUFFIX_PATTERN, "");

  return cleaned.replace(/\s+/g, " ").trim();
}
