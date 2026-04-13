import { RANDOM_WORDS } from "./randomWords";

export function getRandomWord(): string {
  return RANDOM_WORDS[Math.floor(Math.random() * RANDOM_WORDS.length)];
}

export function generateSecretToken(length: number = 3): string {
  const words = [];
  for (let i = 0; i < length; i++) {
    words.push(getRandomWord());
  }
  return words.join('-');
}

export function generateVerificationToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 15)}`;
}
