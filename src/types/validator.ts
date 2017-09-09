import { Validator } from "express-validator";

declare module "express-validator" {
  interface Validator {
    gte(num: number): Validator;
  }
}
