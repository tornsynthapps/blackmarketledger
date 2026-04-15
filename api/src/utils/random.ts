import { RANDOM_WORDS } from "./randomWords";

/**
 * Picks a random word from the internal word list.
 * 
 * @returns (string): A random word.
 */
export function getRandomWord(): string {
  return RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
}

/**
 * Generates a multi-word secret token (e.g., word-word-word).
 * 
 * @param length (number): Number of words to include.
 * @returns (string): The generated secret token.
 */
export function generateSecretToken(length: number = 3): string {
  const words = [];
  for (let i = 0; i < length; i++) {
    words.push(getRandomWord());
  }
  return words.join('-');
}

/**
 * Generates a unique verification token for temporary session tracking.
 * 
 * @returns (string): A unique token string.
 */
export function generateVerificationToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;
}
