// // routes/api/tags.ts
//
// import { Router, Request, Response, NextFunction } from "express";
// import httpStatus = require("http-status");
//
// import { Tag, ITag } from "../../models/Tag";
// import { User } from "../../models/User";
// import { IVote } from "../../concerns/Voting";
// import auth = require("../../config/auth");
// import { check, validationResult, Validator } from "../../concerns/Validator";
//
// const router = Router();
//
//
// router.param("tag", function (req: Request, res: Response, next: NextFunction, id: string) {
//   Validator.validateId(id);
//
//   Tag.findById(id, function(err: Error, tag: ITag) {
//     if (err) {
//       return next(err);
//     }
//
//     if (!tag) {
//       return res.sendStatus(httpStatus.NOT_FOUND);
//     } else {
//       req.tag = tag;
//       return next();
//     }
//   });
// });
//
// router.get("/", auth.optional, function(req: Request, res: Response, next: NextFunction) {
//   Tag.find().populate("author", "username").populate("ref.document").exec(function (err: Error, docs: ITag[]) {
//     console.log(err, docs);
//     res.json(docs);
//   });
// });
//
// // vote a tag
// router.put("/:tag/vote",
//   auth.required,
//   check("vote.impact").isInt(),
//   function (req: Request, res: Response, next: NextFunction) {
//     validationResult(req).throw();
//     const {impact: _impact} = req.body.vote;
//
//     User.findById(req.user.id, function (err, user) {
//       if (!user) {
//         return res.sendStatus(httpStatus.UNAUTHORIZED);
//       }
//
//       req.tag.vote(+_impact, user, function (err: Error, vote: IVote, rawResult: {}) {
//         if (err) {
//           next(err);
//         } else {
//           res.json(vote);
//         }
//       });
//     });
//   });
//
// export = router;
