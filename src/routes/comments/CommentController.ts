// routes/comments/CommentController.ts

import { Controller, PaginationParams, ObjectIdParam } from "../Controller";
import { NextFunction, Request, Response } from "express";
import { Comment, IComment } from "../../models/Comment";
import { User, IUser } from "../../models/User";
import httpStatus = require("http-status");
import { VotingController } from "../voting/VotingController";
import auth = require("../../config/auth");
import _ = require("lodash");


export class CommentController extends Controller {
  protected _voting: VotingController;

  public constructor() {
    super();
    this._voting = new VotingController((req: Request) => req.comment);

    // auth
    this.router.use(this.checkAuthentication);
    this.router.param("comment", this.commentParam);

    this.router.get("/", this.checkPermissions(this.getRecord), this.index);

    // Subresources
    this.router.use("/:comment/vote", this._voting.router);

    // CRUD
    this.router.post("/", auth.required, this.checkPermissions(this.getRecord), this.post);
    this.router.get("/:comment", this.checkPermissions(this.getRecord), this.get);
    this.router.put("/:comment", auth.required, this.checkPermissions(this.getRecord), this.put);
    this.router.delete("/:comment", auth.required, this.checkPermissions(this.getRecord), this.delete);
  }

  @ObjectIdParam
  private async commentParam(req: Request, res: Response, next: NextFunction, id: string) {
    req.comment = await Comment.findById(id)
      .populate("author", "username")
      .populate({
        path: "voting.votes",
        match: {author: {$eq: (typeof req.user !== "undefined") ? req.user.id : undefined}}
      });
    if (req.comment) {
      next();
    } else {
      const error = new Error();
      error.status = httpStatus.NOT_FOUND;
      next(error);
    }
  }

  /**
   * Extract record from request
   * @param {e.Request} req
   * @returns {IComment}
   */
  protected getRecord(req: Request): IComment {
    return req.comment;
  }

  @PaginationParams
  public async index(req: Request, res: Response, next: NextFunction) {
    const {query: {limit, page, sort = {createdAt: -1}, query = {upload: req.upload.id}}} = req;
    const {docs: comments, ...pagination} = await Comment.paginate(query,
      {
        sort,
        page,
        limit
      }
    );
    const response = {
      pagination,
      comments
    };
    res.format({
      html: function() {
        res.render("comments/index", response);
      },
      json: function() {
        res.json(response);
      }
    });
    next();
  }

  public async post(req: Request, res: Response, next: NextFunction) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    req.body = _.pick(req.body, ["body"]);
    req.body.author = user;
    req.body.upload = req.upload;

    const comment = await Comment.create(req.body);
    res.json(comment);
  }

  public async get(req: Request, res: Response, next: NextFunction) {
    res.format({
      html: function() {
        res.render("comments/get", req.comment);
      },
      json: function() {
        res.json(req.comment);
      }
    });
  }

  public async put(req: Request, res: Response, next: NextFunction) {
    if (req.comment.author.id.toString() === req.user.id.toString()) {
      const comment = await Comment.findByIdAndUpdate(req.comment.id, req.body);
      res.json(comment);
    }
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    await req.comment.remove();
    res.sendStatus(httpStatus.NO_CONTENT);
  }
}
