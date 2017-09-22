import express = require("express");
import jwt = require("express-jwt");
const secret = process.env.SECRET;

function getTokenFromHeader(req: express.Request) {
  if (req.header("authorization") && req.header("authorization").split(" ")[0] === "Token" ||
    req.header("authorization") && req.header("authorization").split(" ")[0] === "Bearer") {
    return req.header("authorization").split(" ")[1];
  }

  return undefined;
}

const auth = {
  required: jwt({
    secret: secret,
    userProperty: "user",
    getToken: getTokenFromHeader
  }),
  optional: jwt({
    secret: secret,
    userProperty: "user",
    credentialsRequired: false,
    getToken: getTokenFromHeader
  })
};

export = auth;
