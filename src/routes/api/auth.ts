// routes/api/auth.ts

import { Router, Request, Response, NextFunction } from "express";
import passport = require("passport");
import jsonwebtoken = require("jsonwebtoken");
import jwt = require("express-jwt");
import httpStatus = require("http-status");
import * as url from "url";
import { URL } from "url";
import crypto = require("crypto");

import { User, IUser } from "../../models/User";

/**
 * Authentication Endpoint
 */
const router = Router();
const {
  CLONKSPOT_SECRET,
  CLONKSPOT_URL,
  CLONKSPOT_ISSUER,
  CLONKSPOT_AUDIENCE = "larry",
  CLONKSPOT_RETURN_URL,
} = process.env;

/**
 * Larry-db login
 */
router.post("/login", function (req: Request, res: Response, next: NextFunction) {
  if (!req.body.user) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {"user": "can't be blank"}});
  }

  if (!req.body.user.email) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {"user.email": "can't be blank"}});
  }

  if (!req.body.user.password) {
    return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {"user.password": "can't be blank"}});
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

/**
 * Clonkspot Login
 */
// generate a Authentication Request Token
router.get("/clonkspot", function (req: Request, res: Response, next: NextFunction)  {
  // Token expires in 5 minutes
  const exp = Date.now() + 1000 * 60 * 5;
  // Generate random id - not used atm.
  const jti = crypto.randomBytes(16).toString("hex");

  const token = jsonwebtoken.sign({
    iss: CLONKSPOT_AUDIENCE,
    jti,
    // account for clock glitches
    iat: Math.floor((Date.now() - 1000 * 30) / 1000),
    exp: Math.floor(exp / 1000),
  }, CLONKSPOT_SECRET);

  const url = new URL(CLONKSPOT_URL);
  url.search = token;

  res.redirect(url.toString());
});

// receive Authentication Token
router.get("/clonkspot/scotty", jwt({
  secret: CLONKSPOT_SECRET,
  getToken: function (req: Request) {
    return url.parse(req.url).query;
  },
}), function (req: Request, res: Response, next: NextFunction) {
  User.findOne({username: req.user.sub}, function(err, user) {
    if (err) {
      next(err);
    } else {
      if (user) {
        const url = new URL(CLONKSPOT_RETURN_URL);
        url.search = user.generateJWT();
        res.redirect(url.toString());
      } else {
        // or you could create a new account
        const user = new User({username: req.user.sub, email: req.user.email});
        user.save().then(user => {
          const url = new URL(CLONKSPOT_RETURN_URL);
          url.search = user.generateJWT();
          res.redirect(url.toString());
        }).catch(next);
      }
    }
  });
});

export = router;
