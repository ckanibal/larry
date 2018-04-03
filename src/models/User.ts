// models/User.ts

import { mongoose } from "../config/database";
import { Schema, PaginateModel, Document } from "mongoose";
import mongoosePaginate = require("mongoose-paginate");
import mongooseDelete = require("mongoose-delete");
import crypto = require("crypto");
import jwt = require("jsonwebtoken");


import { Upload, IUpload } from "./Upload";
import * as xmlbuilder from "xmlbuilder";
import { IFile } from "./File";

/**
 * User Model
 */


const secret = process.env.SECRET;

export interface IUser extends Document {
  username: string;
  email: string;
  bio: string;
  image: string;
  favorites: IUpload[];
  hash: string;
  salt: string;
  role: string;
  token?: string;

  setPassword(password: string): void;
  validPassword(password: string): boolean;
  generateJWT(): string;
  toAuthJSON(): {};
  favourite(id: string): Promise<IUpload>;
  unfavourite(id: string): Promise<IUpload>;

  // Authorization
  isAdmin(): boolean;

  // Serialization
  toXML(options?: {}): any;
}

export interface IUserModel extends PaginateModel<IUser> {
  // tbd
}


const UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    required: [true, "can't be blank"],
    match: [/^[a-zA-Z][\S]+$/, "is invalid"],
    index: true
  },
  email: {
    type: String,
    lowercase: true,
    unique: true,
    required: [true, "can't be blank"],
    match: [/\S+@\S+\.\S+/, "is invalid"],
    index: true
  },
  bio: String,
  image: String,
  favorites: [{type: Schema.Types.ObjectId, ref: "Upload"}],
  hash: String,
  salt: String,
  role: String,
}, {timestamps: true});

UserSchema.set("toJSON", {
  transform: function (doc: mongoose.Document, ret: IUser, options: any) {
    return {
      id: ret.id,
      username: ret.username,
    };
  }
});

UserSchema.plugin(mongoosePaginate);
UserSchema.plugin(mongooseDelete);

UserSchema.methods.validPassword = function (password: string) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, "sha512").toString("hex");
  return this.hash === hash;
};

UserSchema.methods.setPassword = function (password: string) {
  this.salt = crypto.randomBytes(16).toString("hex");
  this.hash = crypto.pbkdf2Sync(password, this.salt, 10000, 512, "sha512").toString("hex");
};

UserSchema.methods.generateJWT = function () {
  const today = new Date();
  const exp = new Date(today);
  exp.setDate(today.getDate() + 60);

  return jwt.sign({
    id: this._id,
    username: this.username,
    role: this.role,
    exp: exp.getTime() / 1000,
  }, secret);
};

if (!UserSchema.options.toObject) UserSchema.options.toObject = {};
UserSchema.options.toObject.transform = function (doc: IUser, ret: any, options: {}) {
  // convert the id to a plain string
  ret._id = doc._id.toString();
  return ret;
};

UserSchema.methods.toAuthJSON = function () {
  return {
    username: this.username,
    email: this.email,
    token: this.generateJWT(),
    bio: this.bio,
    image: this.image,
    role: this.role,
  };
};

UserSchema.methods.toProfileJSONFor = function (user: any) {
  return {
    username: this.username,
    bio: this.bio,
    image: this.image || `https://api.adorable.io/avatars/256/${this.username}.png`
  };
};

UserSchema.methods.favourite = function (id: number) {
  if (this.favorites.indexOf(id) === -1) {
    this.favorites.push(id);
  }

  return this.save();
};

UserSchema.methods.unfavourite = function (id: number) {
  this.favorites.remove(id);
  return this.save();
};

UserSchema.methods.isFavorite = function (id: number) {
  return this.favorites.some(function (favoriteId: number) {
    return favoriteId.toString() === id.toString();
  });
};

UserSchema.methods.isAdmin = function() {
  return this.role === "admin";
};

if (!UserSchema.options.toObject) UserSchema.options.toObject = {};
UserSchema.options.toObject.transform = function (doc: IUser, ret: any, options: {}) {
  // convert ids to plain strings
  ret._id = doc._id.toString();
  if (!doc.populated("favorites") && doc.favorites) {
    ret.favorites = doc.favorites.map((f: any) => f.toString());
  }

  return ret;
};

export const User = mongoose.model<IUser>("User", UserSchema) as IUserModel;
