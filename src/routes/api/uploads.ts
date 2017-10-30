import { Request, Response, NextFunction, Router } from "express";
import httpStatus = require("http-status");

import { Link, LinkRel } from "../../Link";
import { CollectionResource, DocumentResource, ObjectResource } from "../../Resource";
import { Upload, IUpload } from "../../models/Upload";
import { Comment } from "../../models/Comment";
import { User, IUser } from "../../models/User";
import { ITag } from "../../models/Tag";

import { paginationParams, check, validationResult, Validator } from "../../concerns/Validator";
import { IVote } from "../../concerns/Voting";
import auth = require("../../config/auth");

const router = Router();


router.get("/", auth.optional, paginationParams,
  function (req: Request, res: Response, next: NextFunction) {
    const {query: {limit: _limit = "50", sort = {createdAt: -1}, query = {}, page: _page = "1"}} = req;

    Upload.paginate(query,
      {
        sort,
        page: +_page,
        limit: +_limit,
        populate: [
          {path: "author", select: "username"},
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

router.post("/", auth.required, function (req: Request, res: Response, next: NextFunction) {
  User.findById(req.user.id).then((user: IUser) => {
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    const upload = new Upload(req.body.upload);
    upload.author = user;

    res.body = upload.save().then(() => {
      res.body = new DocumentResource(upload, new Link(`upload/${upload.id}`, "upload", LinkRel.Self));
      return next();
    }).catch(next);
  }).catch(next);
});

// Preload upload objects on routes with ":upload"
router.param("upload", function (req: Request, res: Response, next: NextFunction, id: string) {
  Upload
    .findById(id)
    .populate("author", "username")
    .populate({
      path: "comments",
      populate: {
        path: "author",
        select: "username",
      }
    })
    .populate("files")
    .populate("dependencies")
    .then(upload => {
      console.log(upload);
      if (!upload) {
        return res.sendStatus(httpStatus.NOT_FOUND);
      } else {
        req.upload = upload;
        return next();
      }
    }).catch(next);
});

// return a upload
router.get("/:upload", auth.optional, function (req: Request, res: Response, next: NextFunction) {
  res.body = new DocumentResource(req.upload, new Link(`upload/${req.upload.id}`, "upload", LinkRel.Self));
  return next();
});

// update an upload
router.put("/:upload", auth.required, function (req: Request, res: Response, next: NextFunction) {
  if (req.upload.author.id.toString() === req.user.id.toString()) {
    const upload = Object.assign(req.upload, req.body);
    upload.save().then((upload: IUpload) => {
      res.body = new DocumentResource(upload, new Link(`uploads/${upload.id}`, "upload", LinkRel.Self));
      return next();
    }).catch(next);
  }
});

// delete an upload
router.delete("/:upload", auth.required, function (req: Request, res: Response, next: NextFunction) {
  if (req.upload.author._id.toString() === req.user.id.toString()) {
    req.upload.remove().then(() => {
      res.sendStatus(httpStatus.NO_CONTENT);
    }).catch(next);
  } else {
    res.sendStatus(httpStatus.FORBIDDEN);
  }
});


/**
 * Votes
 */
// vote an upload
router.put("/:upload/vote",
  auth.required,
  check("vote.impact").isInt(),
  function (req: Request, res: Response, next: NextFunction) {
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
  function (req: Request, res: Response, next: NextFunction) {
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
// Favorite an upload
router.post("/:upload/favourite", auth.required, function (req: Request, res: Response, next: NextFunction) {
  User.findById(req.payload.id).then(function (user) {
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    return user.favourite(req.upload.id).then(function () {
      return req.upload.updateFavoriteCount().then(function (upload: IUpload) {
        return res.json(req.upload);
      });
    });
  }).catch(next);
});


// Unfavourite an upload
router.delete("/:upload/favourite", auth.required, function (req: Request, res: Response, next: NextFunction) {
  User.findById(req.payload.id).then(function (user) {
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    return user.unfavourite(req.upload.id).then(function () {
      return req.upload.updateFavoriteCount().then(function (upload: IUpload) {
        return res.json(req.upload);
      });
    });
  }).catch(next);
});


/**
 * Comments
 */
// create a new comment
router.post("/:upload/comments", auth.required, function (req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.sendStatus(httpStatus.UNAUTHORIZED);
  } else {
    const comment = new Comment(req.body.comment);
    comment.upload = req.upload;
    comment.author = req.user.id;
    comment.save().then(function (comment) {
      res.body = new DocumentResource(comment, new Link(`upload/${req.upload.id}/comments/${comment.id}`, "comment", LinkRel.Self));
      next();
    }).catch(next);
  }
});

// Preload comment object on routes with ":comment"
router.param("comment", function(req: Request, res: Response, next: NextFunction, id: string) {
  Comment.findById(id).then(comment => {
    req.comment = comment;
    next();
  }).catch(next);
});

// delete a comment
router.delete("/:upload/comments/:comment", auth.required, function (req: Request, res: Response, next: NextFunction) {
  if (req.comment.author.toString() === req.user.id.toString()) {
    req.comment.remove().then(function() {
      res.sendStatus(httpStatus.NO_CONTENT);
    }).catch(next);
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
  function (req: Request, res: Response, next: NextFunction) {
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
router.get("/:upload/dependencies", auth.optional, function (req: Request, res: Response, next: NextFunction) {
  // currently disabled
  res.sendStatus(httpStatus.UNAVAILABLE_FOR_LEGAL_REASONS);

  // == never reached ==
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
          "dependencies": {$push: "$dependencies"}
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
