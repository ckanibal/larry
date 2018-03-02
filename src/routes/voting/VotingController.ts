// routes/voting/VotingController.ts

import { Controller, PaginationParams, ObjectIdParam } from "../Controller";
import { NextFunction, Request, Response } from "express";
import httpStatus = require("http-status");
import { User } from "../../models/User";
import { Votable } from "../../models/Vote";


export class VotingController extends Controller {
  public constructor(private _param: (req: Request) => Votable) {
    super();

    // CRUD
    this.router.post("/", this.checkPermissions(), this.post);
  }

  public async post(req: Request, res: Response, next: NextFunction) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    const vote = await this._param(req).vote(req.body.impact, user);
    res.json(vote);
  }
}
