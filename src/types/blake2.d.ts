import * as crypto from "crypto";

declare module "blake2" {
  export function createHash(name: string): crypto.Hash;
}
