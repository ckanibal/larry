import express = require("express");
import httpStatus = require("http-status");

import { Link, LinkRel } from "../../Link";
import { CollectionResource, DocumentResource, ObjectResource } from "../../Resource";
import { Upload, IUpload } from "../../models/Upload";
import { Comment } from "../../models/Comment";
import { User } from "../../models/User";
import { ITag } from "../../models/Tag";

import { paginationParams, check, validationResult, Validator } from "../../concerns/Validator";
import { IVote } from "../../concerns/Voting";
import auth = require("../../config/auth");

const router = express.Router();


router.get("/", auth.optional, paginationParams,
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const {query: {limit: _limit = "50", sort = {createdAt: -1}, query = {}, page: _page = "1"}} = req;

    Upload.paginate(query,
      {
        sort,
        page: +_page,
        limit: +_limit,
        populate: [
          {path: "author", select: "username"},
          {path: "tags", select: "text"}
        ],
      }
    ).then(({docs: uploads, total, limit, page, pages}) => {
      const resource = new CollectionResource(
        uploads.map(doc => new DocumentResource(doc, new Link(doc.id, "Upload", LinkRel.Self))),
        new Link("/", "uploads", LinkRel.Self)
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
    });
  }
);

router.post("/", auth.required, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.sendStatus(httpStatus.UNAUTHORIZED);
  }

  const upload = new Upload(req.body.upload);
  upload.author = user;

  res.body = upload.save().then(() => {
    res.body = new DocumentResource(upload, new Link(`upload/${upload.id}`, "upload", LinkRel.Self));
    return next();
  }).catch(next);
});

// Preload upload objects on routes with ":upload"
router.param("upload", async (req: express.Request, res: express.Response, next: express.NextFunction, id: string) => {
  try {
    const upload = await Upload
      .findById(id)
      .populate("author", "username")
      .populate("file")
      .populate("tags", "text")
      .exec();
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
    if (req.upload.author.id.toString() === req.user.id.toString()) {
      const upload = Object.assign(req.upload, req.body);
      upload.save().then((upload: IUpload) => {
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


/**
 * Votes
 */
// vote an upload
router.put("/:upload/vote",
  auth.required,
  check("vote.impact").isInt(),
  function (req: express.Request, res: express.Response, next: express.NextFunction) {
    validationResult(req).throw();
    const {impact: _impact} = req.body.vote;

    User.findById(req.user.id, function (err, user) {
      if (!user) {
        return res.sendStatus(httpStatus.UNAUTHORIZED);
      }

      req.upload.vote(+_impact, user, function (err: Error, vote: IVote, rawResult: {}) {
        if (err) {
          next(err);
        } else {
          res.json(vote);
        }
      });
    });
  });


/**
 * Tags
 */
// tag an upload
router.post("/:upload/tags",
  auth.required,
  function (req: express.Request, res: express.Response, next: express.NextFunction) {
    const {text} = req.body.tag;
    User.findById(req.user.id, function (err, user) {
      if (!user) {
        return res.sendStatus(httpStatus.UNAUTHORIZED);
      }
      if (req.upload.tags.find((tag: ITag) => tag.text.toLowerCase().localeCompare(text.toLowerCase()) === 0)) {
        // already tagged!
        res.status(httpStatus.CONFLICT);
        res.json(req.upload);
      } else {
        req.upload.tags.push({
          text,
          author: user
        });
        req.upload.save((err: Error, doc: IUpload) => {
          if (err) {
            return next(err);
          } else {
            res.json(doc);
          }
        });
      }
    });
  });

/**
 * Favourites
 */
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


/**
 * Comments
 */

// return an upload's comments
router.get("/:upload/comments", auth.optional, paginationParams, function (req: express.Request, res: express.Response, next: express.NextFunction) {
  const {query: {limit: _limit = "50", _sort = {createdAt: "desc"}, page: _page = "1"}} = req;

  Comment.paginate({upload: req.upload.id}, {
    page: +_page,
    limit: +_limit,
    sort: _sort,
    populate: "author.username"
  }, function (err, result) {
    if (err) {
      return next(err);
    } else {
      res.body = new CollectionResource(result.docs.map(c => new DocumentResource(c)), new Link(`upload/${req.upload.id}/comments`, "comments", LinkRel.Self));
      return next();
    }
  });
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

// delete a comment
router.delete("/:article/comments/:comment", auth.required, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.comment.author.toString() === req.user.id.toString()) {
    req.comment.delete(function (err: Error) {
      if (err) {
        next(err);
      } else {
        res.sendStatus(httpStatus.NO_CONTENT);
      }
    });
  } else {
    res.sendStatus(httpStatus.FORBIDDEN);
  }
});


/**
 * Dependencies
 */
// add a dependency
router.post("/:upload/dependencies",
  auth.required,
  function (req: express.Request, res: express.Response, next: express.NextFunction) {
    const {id} = req.body.dependency;
    User.findById(req.user.id, function (err, user) {
      if (!user) {
        return res.sendStatus(httpStatus.UNAUTHORIZED);
      }
      if (req.user.id === user.id) {
        Upload.findById(id, function (err: Error, upload: IUpload) {
          if (err) {
            return next(err);
          } else {
            req.upload.dependencies.push(upload);
            req.upload.save(function (err: Error) {
              if (err) {
                return next(err);
              } else {
                res.json(req.upload);
              }
            });
          }
        });
      } else {
        return res.sendStatus(httpStatus.FORBIDDEN);
      }
    });
  });

/**
 * Retrieve the dependency tree
 */
router.get("/:upload/dependencies", auth.optional, function (req: express.Request, res: express.Response, next: express.NextFunction) {
  Upload
    .aggregate([
      {
        $match: {
          _id: req.upload._id
        }
      },
      {
        $graphLookup: {
          from: Upload.collection.collectionName,
          startWith: "$dependencies",
          connectFromField: "dependencies",
          connectToField: "_id",
          maxDepth: process.env.QUERY_DEPTH || 3,
          as: "dependencies",
        }
      },
      {
        $unwind: "$dependencies"
      }, {
        $lookup: {
          from: "fs.files",
          localField: "dependencies.file",
          foreignField: "_id",
          as: "dependencies.file"
        }
      }, {
        $group: {
          "_id": "$_id",
          "dependencies": { $push: "$dependencies" }
        }
      }
])
    .exec(function (err: Error, docs: IUpload[]) {
      if (err) {
        return next(err);
      } else {
        const [doc] = docs;
        res.body = new ObjectResource(doc, new Link("/", "Dependencies", LinkRel.Self));
        return next();
      }
    });
});
export = router;
