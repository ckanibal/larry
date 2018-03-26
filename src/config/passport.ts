import passport = require("passport");
import { Strategy as LocalStrategy } from "passport-local";
import { User, IUser } from "../models/User";

passport.use(new LocalStrategy({
  usernameField: "user[identity]",
  passwordField: "user[password]"
}, async function (identity: string, password: string, done: any) {
  try {
    const user = await  User.findOne({$or: [{email: identity}, {username: identity}]});
    if (!user || !user.validPassword(password)) {
      return done(undefined, false, {errors: {"identity or password": "is invalid"}});
    }
    return done(undefined, user);
  } catch (err) {
    return done(err);
  }
}));
