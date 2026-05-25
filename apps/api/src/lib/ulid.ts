import { randomBytes } from "node:crypto";

var ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
var ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;

function encodeTime(time: number, length: number): string {
  var out = "";
  var value = time;
  for (var i = 0; i < length; i += 1) {
    out = ENCODING[value % 32] + out;
    value = Math.floor(value / 32);
  }
  return out;
}

function encodeRandom(length: number): string {
  var bytes = randomBytes(length);
  var out = "";
  for (var i = 0; i < length; i += 1) {
    out += ENCODING[bytes[i] % 32];
  }
  return out;
}

export function createUlid(at = Date.now()): string {
  return encodeTime(at, 10) + encodeRandom(16);
}

export function isValidUlid(value: string): boolean {
  return ULID_RE.test(value);
}
