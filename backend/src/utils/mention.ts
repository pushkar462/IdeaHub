/**
 * Extract @username mentions from a text string.
 * Returns array of usernames without the @ symbol.
 */
export const extractMentions = (text: string): string[] => {
  const regex = /@([a-zA-Z0-9_]+)/g;
  const matches = [...text.matchAll(regex)];
  return [...new Set(matches.map((m) => m[1]))];
};
