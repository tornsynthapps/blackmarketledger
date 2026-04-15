/**
 * Generates a simple alphanumeric hash of a string token.
 * Used for storing and comparing secret tokens securely.
 * 
 * @param token (string): The raw token string.
 * @returns (string): A short alphanumeric hash.
 */
export function hashToken(token: string): string {
  let hash = 0;
  for (let i = 0; i < token.length; i++) {
    const char = token.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
