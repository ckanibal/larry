// routes/authentication/AuthController.ts

import { Controller } from "../Controller";
import { NextFunction, Request, Response } from "express";
import passport = require("passport");
import jsonwebtoken = require("jsonwebtoken");
import jwt = require("express-jwt");
import httpStatus = require("http-status");
import * as crypto from "crypto";
import * as url from "url";
import { URL } from "url";
import { IUser, User } from "../../models/User";

const {
  JWT_AUTH_SECRET,
  JWT_AUTH_URL,
  JWT_AUTH_ISSUER,
  JWT_AUTH_AUDIENCE = "larry",
  JWT_AUTH_RETURN_URL,
} = process.env;

export class AuthController extends Controller {
  public constructor() {
    super();

    // Forms

    this.router.post("/login", this.login);
    this.router.post("/logout", this.logout);

    // jwt-token-Auth
    this.router.get("/jwtauth", this.jwtauth);
    this.router.get("/jwtauth/scotty", jwt({
      secret: new Buffer(JWT_AUTH_SECRET, "base64"),
      getToken: function (req: Request) {
        return url.parse(req.url).query;
      },
    }), this.jwtauth_scotty);
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    if (!req.body.user) {
      return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {"user": "can't be blank"}});
    }

    if (!req.body.user.identity) {
      return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {"user.identity": "can't be blank"}});
    }

    if (!req.body.user.password) {
      return res.status(httpStatus.UNPROCESSABLE_ENTITY).json({errors: {"user.password": "can't be blank"}});
    }

    passport.authenticate("local", {session: false}, (err: Error, user: IUser, info: any) => {
      if (err) {
        return next(err);
      }
      if (user) {
        user.token = user.generateJWT();
        res.format({
          html: function () {
            res.cookie("jwt", user.token);
            res.redirect("/");
          },
          json: function () {
            res.json({user: user.toAuthJSON()});
          }
        });

      } else {
        return res.status(httpStatus.UNAUTHORIZED).json(info);
      }
    })(req, res, next);
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    res.format({
      html: function () {
        res.clearCookie("jwt");
        res.redirect("/");
      },
      json: function () {
        res.json({status: "OK"});
      }
    });
  }

  // generate a Authentication Request Token
  public async jwtauth(req: Request, res: Response, next: NextFunction) {
    // Token expires in 5 minutes
    const exp = Date.now() + 1000 * 60 * 5;
    // Generate random id - not used atm.
    const jti = crypto.randomBytes(16).toString("hex");

    const token = jsonwebtoken.sign({
      iss: JWT_AUTH_AUDIENCE,
      jti,
      // account for clock glitches
      iat: Math.floor((Date.now() - 1000 * 30) / 1000),
      exp: Math.floor(exp / 1000),
    }, new Buffer(JWT_AUTH_SECRET, "base64"));

    const url = new URL(JWT_AUTH_URL);
    url.search = token;

    res.redirect(url.toString());
  }

// receive Authentication Token
  public async jwtauth_scotty(req: Request, res: Response, next: NextFunction) {
    let user = await User.findOne({username: req.user.sub});
    if (!user) {
      // or you could create a new account
      user = await User.create({username: req.user.sub, email: req.user.email});
    }
    res.redirect(JWT_AUTH_RETURN_URL + user.generateJWT());
  }
}
