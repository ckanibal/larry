import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel } from "mongoose";

import uniqueValidator = require("mongoose-unique-validator");
import mongoosePaginate = require("mongoose-paginate");
import slug = require("slug");

import { User, IUser } from "./User";
import { Comment, IComment } from "./Comment";
import { File, IFile } from "./File";
import { Tag, ITag, TagSchema } from "./Tag";

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
  file: IFile;
  comments: IComment[];
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
  tags: [{
    type: Schema.Types.ObjectId,
    ref: Tag.modelName
  }],
  pic: {
    type: Schema.Types.ObjectId,
    ref: File.modelName
  },
  file: {
    type: Schema.Types.ObjectId,
    ref: File.modelName
  },
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
  if (!this.slug) {
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

/**
 *
 * @param query
 * @param sort
 * @param page
 * @param limit
 */
/*
UploadSchema.statics.paginate = async function (query: any, {sort, page, limit}: { sort: string, page: number, limit: number }) {
  const total = await this.count()
    .where(query)
    .exec();

  const docs = await this.find()
    .where(query)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(limit)
    .populate("author", "username")
    .exec();

  const pages = Math.ceil(total / limit);
  return {
    docs,
    total,
    limit,
    page,
    pages
  };
};
*/

export const Upload = mongoose.model<IUpload>("Upload", UploadSchema) as IUploadModel;
