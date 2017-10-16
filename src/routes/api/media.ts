// routes/api/media.ts

import { Router, Request, Response, NextFunction } from "express";
import * as fs from "fs";

import httpStatus = require("http-status");

import { File, IFile } from "../../models/File";
import { Validator } from "../../concerns/Validator";
import auth = require("../../config/auth");
import upload = require("../../config/multer");
import { DocumentResource } from "../../Resource";
import { Link, LinkRel } from "../../Link";

/**
 * Media Serving Endpoint
 */

const router = Router();

/**
 * Pre-load File model for :file parameter
 */
router.param("file", function (req: Request, res: Response, next: NextFunction, id: string) {
  Validator.validateId(id);

  File.findById(id, function (err: Error, file: IFile) {
    if (err) {
      return next(err);
    } else {
      if (!file) {
        return res.sendStatus(httpStatus.NOT_FOUND);
      } else {
        req.media = file;
        return next();
      }
    }
  });
});

/***
 * Serve a file
 * @query download (boolean) Download file
 */
router.get("/:file", auth.optional, function (req: Request, res: Response, next: NextFunction) {
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
});

/**
 * Upload a file
 * @query hashify (boolean) Add hashes for file
 */
router.post("/", auth.required, upload.single("media"), function (req: Request, res: Response, next: NextFunction) {
  req.query.hashify = (typeof req.query.hashify !== "undefined") || false;

  if (typeof req.file !== "undefined") {
    // upload to gridfs
    File.uploadFromFs(req.file, { hashes: req.query.hashify }).then(file => {
      // delete file
      fs.unlink(req.file.path, err => {
        if (err == undefined) {
          // seems good
          res.body = new DocumentResource(file, new Link(file.id, "File", LinkRel.Self));
          return next();
        } else {
          res.sendStatus(httpStatus.INTERNAL_SERVER_ERROR);
        }
      });
    }).catch(next);
  } else {
    res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);
  }
});

export = router;
