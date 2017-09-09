import mongoose = require("mongoose");
import uniqueValidator = require("mongoose-unique-validator");
import crypto = require("crypto");
import jwt = require("jsonwebtoken");

import Voting = require("./Voting");
import { IUploadModel } from "./Upload";
const secret = process.env.SECRET;


interface IUser {
  username: string;
  email: string;
  bio: string;
  image: string;
  favorites: IUploadModel[];
  hash: string;
  salt: string;

  setPassword(password: string): void;
  validPassword(password: string): boolean;
}

const UserSchema = new mongoose.Schema({
  username: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, "is invalid"], index: true},
  email: {type: String, lowercase: true, unique: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, "is invalid"], index: true},
  bio: String,
  image: String,
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: "Upload" }],
  hash: String,
  salt: String
}, { timestamps: true });

UserSchema.set("toJSON", {
  transform: function(doc: mongoose.Document, ret: IUserModel, options: any) {
    return {
      id: ret.id,
      username: ret.username,
    };
  }
});

UserSchema.plugin(uniqueValidator, {message: "is already taken."});
UserSchema.plugin(Voting);

UserSchema.methods.validPassword = function(password: string) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, "sha512").toString("hex");
  return this.hash === hash;
};

UserSchema.methods.setPassword = function(password: string) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, "sha512").toString("hex");
};

UserSchema.methods.generateJWT = function() {
  const today = new Date();
  const exp = new Date(today);
  exp.setDate(today.getDate() + 60);

  return jwt.sign({
    id: this._id,
    username: this.username,
    exp: exp.getTime() / 1000,
  }, secret);
};

UserSchema.methods.toAuthJSON = function(){
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    bio: this.bio,
    image: this.image
  };
};

UserSchema.methods.toProfileJSONFor = function(user: any) {
  return {
    username: this.username,
    bio: this.bio,
    image: this.image || `https://api.adorable.io/avatars/256/${this.username}.png`
  };
};

UserSchema.methods.favorite = function(id: number){
  if (this.favorites.indexOf(id) === -1) {
    this.favorites.push(id);
  }

  return this.save();
};

UserSchema.methods.unfavorite = function(id: number){
  this.favorites.remove(id);
  return this.save();
};

UserSchema.methods.isFavorite = function(id: number){
  return this.favorites.some(function(favoriteId: number){
    return favoriteId.toString() === id.toString();
  });
};

export interface IUserModel extends IUser, mongoose.Document { }
export default mongoose.model<IUserModel>("User", UserSchema);
