import passport = require("passport");
import { Strategy as LocalStrategy } from "passport-local";
import { User, IUser } from "../models/User";

passport.use(new LocalStrategy({
  usernameField: "user[email]",
  passwordField: "user[password]"
}, function(email: string, password: string, done: any) {
  console.log("login:", email, password);
  User.findOne({email: email}).then(function(user: IUser){
    if (!user || !user.validPassword(password)) {
      return done(undefined, false, {errors: {"email or password": "is invalid"}});
    }

    return done(undefined, user);
  }).catch(done);
}));
