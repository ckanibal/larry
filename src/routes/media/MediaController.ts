// routes/media/MediaController.ts

import { Controller, ObjectIdParam } from "../Controller";
import { NextFunction, Request, Response } from "express";
import { File, IFile } from "../../models/File";
import httpStatus = require("http-status");
import auth = require("../../config/auth");
import upload = require("../../config/multer");
import * as fs from "fs";

export class MediaController extends Controller {
  public constructor() {
    super();

    // auth
    this.router.use(this.checkAuthentication);

    this.router.param("file", this.fileParam);
    this.router.post("/", auth.required, this.checkPermissions(this.getRecord), upload.single("media"), this.post);
    this.router.get("/:file", this.checkPermissions(this.getRecord), this.get);
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
  public async post(req: Request, res: Response, next: NextFunction) {
    req.query.hashify = (typeof req.query.hashify !== "undefined") || false;

    if (typeof req.file !== "undefined") {
      // upload to gridfs
      const file = await File.upload(req.file, {hashes: req.query.hashify});
      fs.unlink(req.file.path, err => {
        if (err == undefined) {
          // seems good
          res.json(file);
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
    try {
      req.query.download = (typeof req.query.download !== "undefined") || false;

      res.set({
        "ETag": req.media.md5,
        "Content-Type": req.media.contentType,
        "Content-Length": req.media.length,
        "Content-Disposition": req.query.download ? `attachment; filename="${req.media.filename}"` : "inline",
      });

      if (req.stale) {
        const stream = await req.media.createReadStream();
        stream.pipe(res);
      } else {
        // cache hit <3
        res.sendStatus(httpStatus.NOT_MODIFIED);
      }
    } catch (e) {
      next(e);
    }
  }

  /**
   * Delete a file
   */
  public async delete(req: Request, res: Response, next: NextFunction) {
    req.media.delete().then(function () {
      res.sendStatus(httpStatus.NO_CONTENT);
    }).catch(next);
  }
}
