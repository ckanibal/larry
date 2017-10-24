// routes/api/votes.ts

import { Router, Request, Response, NextFunction } from "express";

import { Vote, IVote } from "../../concerns/Voting";
import { User } from "../../models/User";
import auth = require("../../config/auth");

const router = Router();

router.get("/", auth.optional, function (req: Request, res: Response, next: NextFunction) {
  Vote.find().exec(function (err: Error, docs: IVote[]) {
    res.json(docs);
  });
});

router.post("/", auth.required, function (req: Request, res: Response, next: NextFunction) {
  User.findById(req.user.id, function (err, user) {
    if (!user) {
      return res.sendStatus(httpStatus.UNAUTHORIZED);
    }

    Vote.create(req.body.vote, function (err: Error, vote: IVote) {
      if (err) {
        return next(err);
      } else {
        // saved!
        res.json(vote);
        return next();
      }
    });
  });
});

export = router;
