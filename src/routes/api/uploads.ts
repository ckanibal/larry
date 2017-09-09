import express = require("express");
import mongoose = require("mongoose");
import httpStatus = require("http-status");
import * as fs from "fs";

import { Link, LinkRel } from "../../Link";
import { CollectionResource, DocumentResource } from "../../Resource";
import { default as Upload, IUploadModel } from "../../models/Upload";
import { default as Comment, ICommentModel } from "../../models/Comment";
import { default as User, IUserModel } from "../../models/User";
import { default as File, IFileModel } from "../../models/File";

import auth = require("../auth");
import upload = require("../upload");
const router = express.Router();


router.get("/", auth.optional,
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {query: {limit: _limit = "50", sort = {createdAt: -1}, query = {}, page: _page = "1"}} = req;
    req.checkQuery("page", "invalid page").optional().isInt().gte(1);
    req.checkQuery("limit", "invalid limit").optional().isInt().gte(1);
    req.getValidationResult().then(result => {
      result.throw();
    }).catch(err => {
      err.status = httpStatus.BAD_REQUEST;
      next(err);
    });

    const {docs: uploads, total, limit, page, pages} = await
      Upload.paginate(query,
        {
          sort,
          page: Math.max(1, +_page),
          limit: +_limit,
        }
      );

    const resource = new CollectionResource(
      uploads.map(doc => new DocumentResource(doc)),
      new Link("/uploads", "uploads", LinkRel.Self)
    );
    resource.meta = {
      pagination: {
        total,
        limit,
        page,
        pages,
      }
    };
    res.body = resource;
    return next();
  }
);

router.post("/", auth.required, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.sendStatus(401);
  }

  const upload = new Upload(req.body.upload);
  upload.author = user;

  res.body = upload.save().then(() => {
    res.body = new DocumentResource(upload, new Link(`upload/${upload.id}`, "upload", LinkRel.Self));
    return next();
  }).catch(next);
});

// Preload article objects on routes with ":upload"
router.param("upload", async (req: express.Request, res: express.Response, next: express.NextFunction, id: string) => {
  try {
    const upload = await Upload.findById(id).populate("author", "username").populate("file").exec();
    console.log(upload);
    if (!upload) {
      return res.sendStatus(httpStatus.NOT_FOUND);
    } else {
      req.upload = upload;
      return next();
    }
  } catch (err) {
    return next(err);
  }
});

// return a upload
router.get("/:upload", auth.optional, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.body = new DocumentResource(req.upload, new Link(`upload/${req.upload.id}`, "upload", LinkRel.Self));
  return next();
});

// update an upload
router.put("/:upload", auth.required, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (req.upload.author._id.toString() === req.user.id.toString()) {
      const upload = Object.assign(req.upload, req.body);
      upload.save().then((upload: IUploadModel) => {
        res.body = new DocumentResource(upload, new Link(`uploads/${upload.id}`, "upload", LinkRel.Self));
        return next();
      }).catch(next);
    } else {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
  } catch (err) {
    return next(err);
  }
});

// delete an upload
router.delete("/:upload", auth.required, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (req.upload.author._id.toString() === req.user.id.toString()) {
      return req.upload.remove().then(() => {
        return res.sendStatus(httpStatus.NO_CONTENT);
      });
    } else {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }
  } catch (err) {
    return next(err);
  }
});

// Favorite an article
router.post("/:article/favorite", auth.required, function (req, res, next) {
  /*
  var articleId = req.article._id;

  User.findById(req.payload.id).then(function (user) {
    if (!user) {
      return res.sendStatus(401);
    }

    return user.favorite(articleId).then(function () {
      return req.article.updateFavoriteCount().then(function (article) {
        return res.json({article: article.toJSONFor(user)});
      });
    });
  }).catch(next);
  */
});

/**
 * Pic Subresource
 */
router.get("/:upload/pic", auth.optional, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  req.upload.populate("pic", (err: Error, upload: any) => {
    if (upload.pic !== null) {
      if (err) {
        return next(err);
      }
      res.contentType(upload.pic.contentType);
      upload.pic.createReadStream().pipe(res);
    } else {
      return res.sendStatus(httpStatus.NOT_FOUND);
    }
  });
});

router.put("/:upload/pic", auth.required, upload.single("pic"), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (typeof req.file !== "undefined") {
    // upload to gridfs
    const file = await File.uploadFromFs(req.file);
    // delete file
    fs.unlink(req.file.path, function() {});
    // store reference
    req.upload.pic = file;
    req.upload.save().then(function(upload: IUploadModel) {
      res.body = new DocumentResource(req.upload, new Link(`upload/${req.upload.id}`, "upload", LinkRel.Self));
      return next();
    });
  } else {
    return res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);
  }
});

/**
 * File Subresource
 */
router.get("/:upload/file", auth.optional, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (typeof req.upload.file !== "undefined") {
    res.set({
      "Content-Type": req.upload.file.contentType,
      "Content-Disposition": `attachment; filename="${req.upload.file.filename}"`,
    });
    req.upload.file.createReadStream().pipe(res);
  } else {
    return res.sendStatus(httpStatus.NOT_FOUND);
  }
});

router.put("/:upload/file", auth.required, upload.single("file"), async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (typeof req.file !== "undefined") {
    // upload file to GridFS
    const file = await (await File.uploadFromFs(req.file)).hashify();
    // delete file
    fs.unlink(req.file.path, function() {});
    // store references
    req.upload.file = file;
    req.upload.save().then(function(upload: IUploadModel) {
      res.body = new DocumentResource(req.upload, new Link(`upload/${req.upload.id}`, "upload", LinkRel.Self));
      return next();
    }).catch(next);
  } else {
    return res.sendStatus(httpStatus.UNPROCESSABLE_ENTITY);
  }
});

// Unfavorite an article
router.delete("/:article/favorite", auth.required, function (req, res, next) {
  /*
  var articleId = req.article._id;

  User.findById(req.payload.id).then(function (user) {
    if (!user) {
      return res.sendStatus(401);
    }

    return user.unfavorite(articleId).then(function () {
      return req.article.updateFavoriteCount().then(function (article) {
        return res.json({article: article.toJSONFor(user)});
      });
    });
  }).catch(next);
  */
});

// Preload comment object on routes with ":comment"
router.param("comment", async (req: express.Request, res: express.Response, next: express.NextFunction, id: string) => {
  try {
    const comment = await Comment.findById(id);
    console.log(comment);
    if (!comment) {
      return res.sendStatus(httpStatus.NOT_FOUND);
    } else {
      req.comment = comment;
      return next();
    }
  } catch (err) {
    return next(err);
  }
});

// return an upload's comments
router.get("/:upload/comments", auth.optional, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const comments = await Comment.find({
    upload: req.upload.id
    })
    .sort({ createdAt: "desc" })
    .populate("author", "username");

  res.body = new CollectionResource(comments.map(c => new DocumentResource(c)), new Link(`upload/${req.upload.id}/comments`, "comments", LinkRel.Self));
  return next();
});

// create a new comment
router.post("/:upload/comments", auth.required, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (!req.user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    const comment = new Comment(req.body.comment);
    comment.upload = req.upload;
    comment.author = req.user.id;

    comment.save().then(function (comment) {
      res.body = new DocumentResource(comment, new Link(`upload/${req.upload.id}/comments/${comment.id}`, "comment", LinkRel.Self));
      return next();
    }).catch(next);
  } catch (err) {
    return next(err);
  }
});

// delete a comment
router.delete("/:article/comments/:comment", auth.required, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.comment.author.toString() === req.user.id.toString()) {
    req.upload.comments.remove(req.comment._id);
    req.upload.save()
      .then(Comment.find({_id: req.comment._id}).remove().exec())
      .then(function () {
        res.sendStatus(httpStatus.NO_CONTENT);
      });
  } else {
    res.sendStatus(httpStatus.FORBIDDEN);
  }
});

export = router;
