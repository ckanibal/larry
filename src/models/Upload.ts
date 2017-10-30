import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel } from "mongoose";

import uniqueValidator = require("mongoose-unique-validator");
import mongoosePaginate = require("mongoose-paginate");
import slug = require("slug");

import { User, IUser } from "./User";
import { Comment, IComment } from "./Comment";
import { File, IFile } from "./File";
import { ITag, TagSchema } from "./Tag";

import { votingPlugin, Votable } from "../concerns/Voting";

/**
 * Upload Model
 */


export interface IUpload extends Document, Votable {
  slug: string;
  title: string;
  description: string;
  author: IUser;
  tags: ITag[];
  pic: IFile;
  files: IFile[];
  comments: IComment[];
  dependencies: IUpload[];
  meta: any;
}

export interface IUploadModel extends PaginateModel<IUpload> {
  // declare all additional schema methods here
  slugify(): string;
  updateFavoriteCount(): IUser;
}


const UploadSchema = new Schema({
  slug: {
    type: String,
    lowercase: true,
    unique: true,
    required: true
  },
  title: {
    type: String,
    required: true,
    text: true
  },
  description: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: User.modelName
  },
  tags: [TagSchema],
  comments: [{
    type: Schema.Types.ObjectId,
    ref: "Comment",
  }],
  pic: {
    type: Schema.Types.ObjectId,
    ref: File.modelName
  },
  files: [{
    type: Schema.Types.ObjectId,
    ref: File.modelName
  }],
  dependencies: [{
    type: Schema.Types.ObjectId,
    ref: "Upload",
  }]
}, {
  timestamps: true
});

UploadSchema.plugin(uniqueValidator, {
  message: "is already taken"
});
UploadSchema.plugin(mongoosePaginate);
UploadSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1 (at least for now)"
  }
});

UploadSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slugify();
  }

  next();
});

UploadSchema.methods.slugify = function () {
  this.slug = slug(this.title);
};

UploadSchema.methods.updateFavoriteCount = function () {
  const upload = this;

  return User.count({favorites: {$in: [upload._id]}}).then(function (count: Number) {
    upload.favoritesCount = count;
    return upload.save();
  });
};

UploadSchema.methods.comment = function (comment: IComment, user: IUser, fn: Function) {
  comment.author = user || comment.author;
  comment.upload = this._id;
  comment.save(function (err: Error, ...args: any[]) {
    if (err) {
      throw err;
    } else {
      fn(...args);
    }
  });
};

export const Upload = mongoose.model<IUpload>("Upload", UploadSchema) as IUploadModel;
