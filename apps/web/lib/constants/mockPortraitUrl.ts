/**
 * Stable portrait URL per username for mock feed/comments (RandomUser.me catalog).
 * Same handle always maps to the same photo so rows stay recognizable.
 */
export function getMockPortraitUrlForUsername(username: string): string {
  const s = String(username);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (Math.imul(31, hash) + s.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % 100;
  const useWomen = Math.abs(hash) % 2 === 0;
  if (useWomen) {
    return "https://randomuser.me/api/portraits/women/" + idx + ".jpg";
  }
  return "https://randomuser.me/api/portraits/men/" + idx + ".jpg";
}
