import { NextFunction, Request, RequestHandler, Response, Router } from "express";
import "reflect-metadata";
import * as validator from "validator";
import * as assert from "assert";
import httpStatus = require("http-status");
import { IUser, User } from "../models/User";
import auth = require("../config/auth");
import { Readable } from "stream";
import { Types } from "mongoose";

export interface IController {
  router: Router;
}

interface RecordWithOwnership {
  author: IUser;
}

export abstract class Controller extends Readable implements IController {
  public router: Router;

  protected static RESERVED_FIELDS = ["_id", "__v", "created_at", "updated_at", "voting", "deleted"];

  public constructor() {
    super();
    this.router = Router();
  }

  /**
   * Extract the resource record from a request
   * @param {Request} req
   * @returns {RecordWithOwnership}
   */
  protected getRecord(req?: Request): RecordWithOwnership {
    return {
      author: undefined
    };
  }

  /**
   * Clever authorization heuristic
   * @param {(req: Request, ...args: any[]) => RecordWithOwnership} getRecord
   * @returns {Promise<(req: Request, res: e.Response, next: e.NextFunction) => Promise<void>>}
   */
  protected checkPermissions(getRecord?: (req: Request, ...args: any[]) => RecordWithOwnership) {
    return async function(req: Request, res: Response, next: NextFunction) {
      // Prepare Error (Gorky Park - Don't Pull the Trigger)
      const error = new Error();
      error.status = httpStatus.UNAUTHORIZED;

      switch (req.method.toLowerCase()) {
        case "get":
          next();
          break;
        case "put":
        case "delete":
          const r = getRecord(req, res, next);
          if (req.user && (r.author.id === req.user.id || req.user.isAdmin())) {
            next();
          } else {
            next(error);
          }
          break;
        case "post":
          if (req.user) {
            next();
          } else {
            next(error);
          }
          break;
        default:
          if (req.user && req.user.isAdmin()) {
            next();
          } else {
            next(error);
          }
      }
    };
  }

  /**
   *
   * @param {e.Request} req
   * @param {e.Response} res
   * @param {e.NextFunction} next
   * @returns {Promise<void>}
   */
  protected async checkAuthentication(req: Request, res: Response, next: NextFunction) {
    auth.optional(req, res, (error?) => {
      res.locals.user = req.user;
      next(error);
    });
  }

  /**
   *
   * @param {number} size
   * @private
   */
  public _read(size?: number) {
    // no manual read
  }
}

// Decorators
type ExpressHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
export function PaginationParams(target: any, key: string | symbol, descriptor: TypedPropertyDescriptor<ExpressHandler>) {
  if (descriptor === undefined) {
    descriptor = Object.getOwnPropertyDescriptor(target, key);
  }
  const originalMethod = descriptor.value;

  // hook method
  descriptor.value = function (req: Request, ...args: any[]) {
    const {query: {limit: _limit = "50", page: _page = "1", ...query}} = req;
    req.query = {page: Math.max(1, +_page) || 1, limit: Math.max(1, +_limit) || 50, ...query};
    return originalMethod.call(this, req, ...args);
  };
  return descriptor;
}

type ExpressParameterHandler<T> = (req: Request, res: Response, next: NextFunction, id: T) => Promise<void>;
export function ObjectIdParam(target: any, key: string | symbol, descriptor: TypedPropertyDescriptor<ExpressParameterHandler<string>>) {
  if (descriptor === undefined) {
    descriptor = Object.getOwnPropertyDescriptor(target, key);
  }
  const originalMethod = descriptor.value;

  // hook method
  descriptor.value = function (req: Request, res: Response, next: NextFunction, id: string) {
    if (validator.isMongoId(id)) {
      return originalMethod.apply(this, arguments);
    } else {
      const error = new Error("Parameter is not a valid id.");
      error.status = httpStatus.BAD_REQUEST;
      return next(error);
    }
  };
  return descriptor;
}

export function ValidateAuthor(target: any, key: string | symbol, descriptor: TypedPropertyDescriptor<ExpressHandler>) {
  if (descriptor === undefined) {
    descriptor = Object.getOwnPropertyDescriptor(target, key);
  }
  const originalMethod = descriptor.value;

  // hook method
  descriptor.value = async function (req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.body.author) {
        const user = await User.findById(req.user.id);
        req.body.author = user;
      }

      assert.ok(req.user.role === "admin" || req.body.author.id === req.user.id, "Invalid author.");
      return originalMethod.apply(this, arguments);
    } catch (e) {
      e.status = httpStatus.FORBIDDEN;
      next(e);
    }
  };
  return descriptor;
}
