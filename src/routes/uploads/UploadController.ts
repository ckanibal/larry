// routes/uploads/UploadController.ts

import { NextFunction, Request, Response } from "express";
import httpStatus = require("http-status");
import _ = require("lodash");
import * as builder from "xmlbuilder";
import { Controller, PaginationParams, ObjectIdParam, ValidateAuthor } from "../Controller";
import { Upload, IUpload } from "../../models/Upload";
import { CommentController } from "../comments/CommentController";
import { VotingController } from "../voting/VotingController";
import { TagController } from "./TagController";
import { EventStreamSocket } from "../../concerns/EventStream";
import auth = require("../../config/auth");

export class UploadController extends Controller {
  protected _comments: CommentController;
  protected _voting: VotingController;
  protected _tags: TagController;

  public constructor() {
    super();
    this._comments = new CommentController();
    this._voting = new VotingController((req: Request) => req.upload);
    this._tags = new TagController ((req: Request) => req.upload);

    this.router.param("upload", this.uploadParam);
    UploadController.RESERVED_FIELDS = Controller.RESERVED_FIELDS.concat(["comments", "tags"]);

    // auth
    this.router.use(this.checkAuthentication);

    this.router.get("/", auth.optional, this.checkPermissions(this.getRecord), this.index.bind(this));

    // Subresources
    this.router.use("/:upload/comments", this._comments.router);
    this.router.use("/:upload/vote", this._voting.router);
    this.router.use("/:upload/tags", this._tags.router);

    // CRUD
    this.router.post("/", auth.required, this.checkPermissions(this.getRecord), this.post.bind(this));
    this.router.get("/:upload", this.checkPermissions(this.getRecord), this.get.bind(this));
    this.router.put("/:upload", auth.required, this.checkPermissions(this.getRecord), this.put.bind(this));
    this.router.delete("/:upload", auth.required, this.checkPermissions(this.getRecord), this.delete.bind(this));
  }

  protected getRecord(req: Request, ...args: any[]): IUpload {
    return req.upload;
  }

  @ObjectIdParam
  private async uploadParam(req: Request, res: Response, next: NextFunction, id: string) {
    try {
      req.upload = await Upload
        .findById(id)
        .populate("author", "username")
        .populate({
          path: "voting.votes",
          match: {author: {$eq: (typeof req.user !== "undefined") ? req.user.id : undefined}}
        })
        .populate("pic")
        .populate("files")
        .populate("dependencies")
        .populate({path: "comments", options: {limit: 5, sort: {"created_at": -1}}});

      if (req.upload) {
        next();
      } else {
        const error = new Error();
        error.status = httpStatus.NOT_FOUND;
        next(error);
      }
    } catch (e) {
      next(e);
    }
  }

  @PaginationParams
  public async index(req: Request, res: Response, next: NextFunction) {
    const {query: {limit, page, sort = {createdAt: -1}, query = {}}} = req;
    console.log(query);
    const {docs: uploads, ...pagination} = await Upload.paginate(query,
      {
        sort,
        page,
        limit,
      },
    );
    const response = {
      pagination,
      uploads
    };

    res.format({
      html: function () {
        res.render("upload/index", response);
      },
      json: function () {
        res.json(response);
      },
      "application/xml": function () {
        const xml = builder.create("resource")
          .att("title", "uploads")
          .ele("_meta")
          .ele("max_results", pagination.limit).up()
          .ele("page", pagination.page).up()
          .ele("total", pagination.total).up()
          .up()
          .ele({resource: uploads.map((u: IUpload) => u.toObject({xml: true}))})
          .att("title", "upload")
          .up();
        res.send(xml.end({pretty: true}));
      },
      "text/event-stream": () => {
        const socket = new EventStreamSocket(req, res, next);
        this.pipe(socket);
      }
    });
    next();
  }

  @ValidateAuthor
  public async post(req: Request, res: Response, next: NextFunction) {
    try {
      req.body = _.omit(req.body, UploadController.RESERVED_FIELDS);

      const upload = await new Upload(req.body).save();
      this.push(JSON.stringify(upload.toJSON()));
      res.json(upload);
    } catch (e) {
      next(e);
    }
  }

  public async get(req: Request, res: Response, next: NextFunction) {
    res.format({
      html: function () {
        res.render("upload/get", req.upload);
      },
      json: function () {
        res.json(req.upload);
      },
      "application/xml": function () {
        const xml = builder.create("resource").ele(req.upload.toObject({xml: true}));
        res.send(xml.end({pretty: true}));
      }
    });
  }

  @ValidateAuthor
  public async put(req: Request, res: Response, next: NextFunction) {
    _.assign(req.upload, _.omit(req.body, UploadController.RESERVED_FIELDS));
    const upload = await req.upload.save();
    res.json(upload);
  }

  public async delete(req: Request, res: Response, next: NextFunction) {
    await req.upload.delete();
    res.sendStatus(httpStatus.NO_CONTENT);
  }
}
