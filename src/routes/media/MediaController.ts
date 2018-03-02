// routes/media/MediaController.ts

import { Controller, ObjectIdParam } from "../Controller";
import { NextFunction, Request, Response } from "express";
import httpStatus = require("http-status");
import { File, IFile } from "../../models/File";
import auth = require("../../config/auth");
import upload = require("../../config/multer");
import * as fs from "fs";

export class MediaController extends Controller {
  public constructor() {
    super();

    this.router.param("file", this.fileParam);
    this.router.post("/", auth.required, this.checkPermissions(this.getRecord), upload.single("media"), this.post);
    this.router.get("/:file", auth.optional, this.checkPermissions(this.getRecord), this.get);
    this.router.delete("/:file", auth.required, this.checkPermissions(this.getRecord), this.delete);
  }

  protected getRecord(req: Request): IFile {
    return req.media;
  }

  /**
   * Preload file parameter
   * @param {e.Request} req
   * @param {e.Response} res
   * @param {e.NextFunction} next
   * @param {string} id
   * @returns {Promise<void>}
   */
  @ObjectIdParam
  private async fileParam(req: Request, res: Response, next: NextFunction, id: string) {
    const file = await File.findById(id);
    if (file) {
      req.media = file;
      next();
    } else {
      const error = new Error();
      error.status = httpStatus.NOT_FOUND;
      next(error);
    }
  }

  /**
   * Upload a file
   * @query hashify (boolean) Add hashes for file
   */
  public async post (req: Request, res: Response, next: NextFunction) {
    req.query.hashify = (typeof req.query.hashify !== "undefined") || false;

    if (typeof req.file !== "undefined") {
      // upload to gridfs
      const file = await File.uploadFromFs(req.file, {hashes: req.query.hashify});
      fs.unlink(req.file.path, err => {
        if (err == undefined) {
          // seems good
          res.body = file;
          return next();
        } else {
          res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
        }
      });
    } else {
      res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);
    }
  }

  /***
   * Serve a file
   * @query download (boolean) Download file
   */
  public async get(req: Request, res: Response, next: NextFunction) {
    req.query.download = (typeof req.query.download !== "undefined") || false;

    res.set({
      "ETag": req.media.md5,
      "Content-Type": req.media.contentType,
      "Content-Length": req.media.length,
      "Content-Disposition": req.query.download ? `attachment; filename="${req.media.filename}"` : "inline",
    });

    if (req.stale) {
      req.media.createReadStream().pipe(res);
    } else {
      // cache hit <3
      res.sendStatus(httpStatus.NOT_MODIFIED);
    }
  }

  /**
   * Delete a file
   */
  public async delete(req: Request, res: Response, next: NextFunction) {
    if (req.media.author.toString() === req.user.id.toString()) {
      req.media.remove().then(function() {
        res.sendStatus(httpStatus.NO_CONTENT);
      }).catch(next);
    } else {
      res.sendStatus(httpStatus.FORBIDDEN);
    }
  }
}
