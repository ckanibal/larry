// routes/voting/VotingController.ts

import { Controller, PaginationParams, ObjectIdParam } from "../Controller";
import { NextFunction, Request, Response } from "express";
import httpStatus = require("http-status");
import { User } from "../../models/User";
import { IVote, Votable } from "../../models/Vote";
import auth = require("../../config/auth");


export class VotingController extends Controller {
  public constructor(private _param: (req: Request) => Votable) {
    super();

    // auth
    this.router.use(this.checkAuthentication);

    // CRUD
    this.router.post("/", auth.required, this.checkPermissions(), this.post);
  }

  /**
   * This function binds to this (because it is state-dependant)
   * @param {Request} req
   * @param {Response} res
   * @param {e.NextFunction} next
   * @returns {Promise<Response>}
   */
  public post = async(req: Request, res: Response, next: NextFunction) => {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    this._param(req).vote(req.body.impact, user, (err?: Error, vote?: IVote) => {
      if (!err) {
        res.json(vote);
      } else {
        next(err);
      }
    });
  };
}
