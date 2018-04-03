import * as _ from "lodash";
import httpStatus = require("http-status");
import { Controller, ValidateAuthor } from "../Controller";
import { NextFunction, Request, Response } from "express";
import auth = require("../../config/auth");
import { Upload } from "../../models/Upload";
import { ITag, Taggable } from "../../models/Tag";

export class TagController extends Controller {
  public constructor(private _param: (req: Request) => Taggable) {
    super();

    // auth
    this.router.use(this.checkAuthentication);

    // CRUD
    this.router.post("/", auth.required, this.checkPermissions(this.getRecord), this.post.bind(this));
  }

  @ValidateAuthor
  public async post(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = _.pick(req.body, "text", "author");

      // reserved tag-names start with a dot
      if ((req.body.text && req.body.text.startsWith(".")) && req.user.role != "admin") {
        const err = new Error("Reserved tag!");
        err.status = httpStatus.FORBIDDEN;
        throw err;
      }

      const result = await this._param(req).tag(req.body);
      res.json(result);
    } catch (e) {
      e.status = httpStatus.BAD_REQUEST;
      next(e);
    }
  }
}
