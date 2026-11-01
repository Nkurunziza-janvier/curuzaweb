import { randomInt } from "node:crypto";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReference(prefix: string, length = 6) {
  let value = "";
  for (let index = 0; index < length; index += 1) {
    value += alphabet[randomInt(0, alphabet.length)];
  }
  return `${prefix}-${value}`;
}
