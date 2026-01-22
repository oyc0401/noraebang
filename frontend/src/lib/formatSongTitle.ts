export function formatSongTitle(
  title: string,
  titleKo?: string,
  titleJa?: string,
  titleLatin?: string,
) {
  if (titleKo) {
    if (titleJa) return `${titleKo} - ${titleJa}`;
    if (titleLatin) return `${titleKo} - ${titleLatin}`;
    return titleKo;
  }
  if (titleJa) {
    if (titleLatin) return `${titleJa} - ${titleLatin}`;
    return titleJa;
  }
  if (titleLatin) return titleLatin;
  return title;
}
