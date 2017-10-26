// routes/api/user.ts

import express = require("express");
import httpStatus = require("http-status");

import { User, IUser } from "../../models/User";
const auth = require("../../config/auth");

/**
 * Provide current user information
 */
const router = express.Router();


router.get("/", auth.required, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  User.findById(req.user.id).then((user: IUser) => {
    if (!user) {
      return res.sendStatus(httpStatus.FORBIDDEN);
    }

    return res.json({user: user.toObject()});
  }).catch(next);
});

router.put("/", auth.required, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  User.findById(req.user.id).then((user: IUser) => {
    if (!user) { return res.sendStatus(401); }

    // only update fields that were actually passed...
    if (typeof req.body.user.username !== "undefined") {
      user.username = req.body.user.username;
    }
    if (typeof req.body.user.email !== "undefined") {
      user.email = req.body.user.email;
    }
    if (typeof req.body.user.bio !== "undefined") {
      user.bio = req.body.user.bio;
    }
    if (typeof req.body.user.image !== "undefined") {
      user.image = req.body.user.image;
    }
    if (typeof req.body.user.password !== "undefined") {
      user.setPassword(req.body.user.password);
    }

    return user.save().then(function() {
      return res.json({user: user.toObject()});
    });
  }).catch(next);
});

export = router;
