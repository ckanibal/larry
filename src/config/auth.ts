import express = require("express");
import jwt = require("express-jwt");
import { ExtractJwt } from "passport-jwt";

const secret = process.env.SECRET;

function getTokenFromHeader(req: express.Request) {
  if (req.header("authorization") && req.header("authorization").split(" ")[0] === "Token" ||
    req.header("authorization") && req.header("authorization").split(" ")[0] === "Bearer") {
    return req.header("authorization").split(" ")[1];
  }
  return undefined;
}

function cookieExtractor(req: express.Request) {
  if (req && req.cookies) {
    return req.cookies["jwt"];
  }
  return undefined;
}

const auth = {
  required: jwt({
    secret: secret,
    userProperty: "user",
    getToken: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), cookieExtractor]),
  }),
  optional: jwt({
    secret: secret,
    userProperty: "user",
    credentialsRequired: false,
    getToken: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), cookieExtractor]),
  })
};

export = auth;
