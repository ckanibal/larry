// routes/BaseController.ts

import { Controller, ObjectIdParam } from "./Controller";
import { NextFunction, Request, Response } from "express";
import httpStatus = require("http-status");
import auth = require("../config/auth");

export class BaseController extends Controller {
  public constructor() {
    super();

    this.router.get("/", auth.optional, this.index);
  }

  private async index(req: Request, res: Response, next: NextFunction) {
    res.format({
      html: function() {
        res.render("base/index", {user: req.user});
      },
      default: function() {
        res.json({});
      }
    });
  }
}
