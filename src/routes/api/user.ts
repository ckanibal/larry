// routes/api/user.ts

import express = require("express");
import passport = require("passport");
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

router.post("/login", (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.body.user.email) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {email: "can't be blank"}});
  }

  if (!req.body.user.password) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {password: "can't be blank"}});
  }

  passport.authenticate("local", { session: false }, (err: any, user: any, info: any) => {
    if (err) { return next(err); }

    if (user) {
      user.token = user.generateJWT();
      return res.json({user: user.toAuthJSON()});
    } else {
      return res.status(422).json(info);
    }
  })(req, res, next);
});

export = router;
