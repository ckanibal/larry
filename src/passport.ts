import passport = require("passport");
import mongoose = require("mongoose");
import { Strategy as LocalStrategy } from "passport-local";
import { default as User, IUserModel } from "./models/User";

passport.use(new LocalStrategy({
  usernameField: "user[email]",
  passwordField: "user[password]"
}, function(email: string, password: string, done: any) {
  User.findOne({email: email}).then(function(user: IUserModel){
    if (!user || !user.validPassword(password)) {
      return done(undefined, false, {errors: {"email or password": "is invalid"}});
    }

    return done(undefined, user);
  }).catch(done);
}));
