// routes/api/auth.ts

import { Router, Request, Response, NextFunction } from "express";
import passport = require("passport");
import jwt = require("jsonwebtoken");
import httpStatus = require("http-status");
import { URL } from "url";
import crypto = require("crypto");


/**
 * Authentication Endpoint
 */
const router = Router();
const { CLONKSPOT_SECRET, CLONKSPOT_URL } = process.env;

/**
 * Larry-db login
 */
router.post("/login", function (req: Request, res: Response, next: NextFunction) {
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

/**
 * Clonkspot Login
 */
router.get("/clonkspot", function (req: Request, res: Response, next: NextFunction)  {
  // Token expires in 5 minutes
  const exp = Date.now() + 1000 * 60 * 5;
  // Generate random id - not used atm.
  const jti = crypto.randomBytes(16).toString("hex");

  const token = jwt.sign({
    iss: "example",
    jti,
    iat: Math.floor(Date.now() / 1000),
    // account for clock glitches
    exp: Math.floor(exp / 1000 - 60),
  }, CLONKSPOT_SECRET);

  const url = new URL(CLONKSPOT_URL);
  url.search = token;

  res.redirect(url.toString());
});

export = router;


