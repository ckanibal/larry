// routes/comments/CommentController.ts

import { Controller, PaginationParams, ObjectIdParam } from "../Controller";
import { NextFunction, Request, Response } from "express";
import { Comment, IComment } from "../../models/Comment";
import { User, IUser } from "../../models/User";
import httpStatus = require("http-status");
import { VotingController } from "../voting/VotingController";
import auth = require("../../config/auth");
import _ = require("lodash");
import { EventStreamSocket } from "../../concerns/EventStream";

export class CommentController extends Controller {
  protected _voting: VotingController;

  public constructor() {
    super();
    this._voting = new VotingController((req: Request) => req.comment);

    // auth
    this.router.use(this.checkAuthentication);
    this.router.param("comment", this.commentParam);

    this.router.get("/", this.index.bind(this));

    // Subresources
    this.router.use("/:comment/vote", this._voting.router);

    // CRUD
    this.router.post("/", auth.required, this.checkPermissions(this.getRecord), this.post.bind(this));
    this.router.get("/:comment", this.checkPermissions(this.getRecord), this.get.bind(this));
    this.router.put("/:comment", auth.required, this.checkPermissions(this.getRecord), this.put.bind(this));
    this.router.delete("/:comment", auth.required, this.checkPermissions(this.getRecord), this.delete.bind(this));
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
    const {query: {limit, page, sort = {createdAt: -1}, query = {}}} = req;
    if (req.upload) {
      query["upload"] = req.upload.id;
    }
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
      html: function () {
        res.render("comments/index", response);
      },
      json: function () {
        res.json(response);
      },
      "text/event-stream": () => {
        const socket = new EventStreamSocket(req, res, next);
        this.pipe(socket);
      }
    });
    next();
  }

  public async post(req: Request, res: Response, next: NextFunction) {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    req.body = _.omit(req.body, CommentController.RESERVED_FIELDS);
    req.body.author = user;
    req.body.upload = req.upload || req.body.upload;

    const comment = await new Comment(req.body).save();
    this.push(JSON.stringify(comment.toJSON()));
    res.json(comment);
  }

  public async get(req: Request, res: Response, next: NextFunction) {
    res.format({
      html: function () {
        res.render("comments/get", req.comment);
      },
      json: function () {
        res.json(req.comment);
      }
    });
  }

  public async put(req: Request, res: Response, next: NextFunction) {
    const comment = await Comment.findByIdAndUpdate(req.comment.id, _.omit(req.body, CommentController.RESERVED_FIELDS));
    res.json(comment);
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    await req.comment.delete();
    res.sendStatus(httpStatus.NO_CONTENT);
  }
}
