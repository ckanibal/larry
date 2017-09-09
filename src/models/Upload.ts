import mongoose = require("mongoose");
import uniqueValidator = require("mongoose-unique-validator");
import slug = require("slug");

import Voting = require("./Voting");
import { default as User, IUserModel } from "./User";
import { default as Comment, ICommentModel } from "./Comment";
import { default as File } from "./File";

interface IUpload {
  slug: string;
  title: string;
  description: string;
  author: IUserModel;
  tagList: string[];
  pic: typeof File;
  file: typeof File;
  comments: typeof Comment[];
  meta: any;

  // methods
  slugify(): string;
  updateFavoriteCount(): typeof User;
}

const UploadSchema = new mongoose.Schema({
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  tags: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Tag",
  }],
  pic: {
    type: mongoose.Schema.Types.ObjectId,
    ref: File.modelName
  },
  file: {
    type: mongoose.Schema.Types.ObjectId,
    ref: File.modelName
  }
}, {
  timestamps: true
});

UploadSchema.plugin(uniqueValidator, {
  message: "is already taken"
});
UploadSchema.plugin(Voting);

UploadSchema.pre("validate", function (next) {
  if (!this.slug) {
    this.slugify();
  }

  next();
});

UploadSchema.methods.slugify = function() {
  this.slug = slug(this.title);
};

UploadSchema.methods.updateFavoriteCount = function() {
  const upload = this;

  return User.count({favorites: {$in: [upload._id]}}).then(function(count: Number) {
    upload.favoritesCount = count;
    return upload.save();
  });
};

UploadSchema.methods.comment = function(comment: ICommentModel, user: IUserModel, fn: Function) {
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
UploadSchema.statics.paginate = async function (query: any, {sort, page, limit}: { sort: string, page: number, limit: number }) {
  const total = await this.count()
    .where(query)
    .exec();

  const docs = await this.find()
    .where(query)
    .sort(sort)
    .skip((page - 1)  * limit)
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

export interface IUploadModel extends IUpload, mongoose.Document { }
export default mongoose.model<IUploadModel>("Upload", UploadSchema);
