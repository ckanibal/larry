// concerns/Sanitizer.ts

import { Request, Response, NextFunction } from "express";
import { check, validationResult } from "express-validator/check";
export { check, validationResult } from "express-validator/check";
import { Types } from "mongoose";

import httpStatus = require("http-status");
import validator = require("validator");


/**
 * Validator namespace supports multiple validators
 */
export namespace Validator {
  /**
   * Validates a ObjectId
   * @param id
   * @returns {string}
   */
  export function validateId(id: string) {
    if (validator.isHexadecimal(id) && Types.ObjectId.isValid(id)) {
      return id;
    } else {
      const error = new Error("Validation failed");
      error.status = httpStatus.BAD_REQUEST;
      throw error;
    }
  }
}

/**
 * Filter Pagination Parameters
 * @param req
 * @param res
 * @param next
 */
export const paginationParams = [
  (req: Request, res: Response, next: NextFunction) => {
    req.params.page = req.params.page || 1;
    req.params.limit = req.params.limit || 50;
    next();
  },
  check("page", "invalid page").isInt({min: 1}),
  check("limit", "invalid limit").isInt({min: 0}),
  (req: Request, res: Response, next: NextFunction) => {
    try {
      validationResult(req).throw();
      next();
    } catch (err) {
      err.status = httpStatus.BAD_REQUEST;
      return next(err);
    }
  },
];
