import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel, Types } from "mongoose";

import mongoosePaginate = require("mongoose-paginate");
import slug = require("slug");
import * as xmlbuilder from "xmlbuilder";


import { User, IUser } from "./User";
import { File, IFile } from "./File";
import { ITag, Tag, TagSchema } from "./Tag";

import { votingPlugin, Votable } from "./Vote";


/**
 * Upload Model
 */


export interface IUpload extends Document, Votable {
  slug: string;
  title: string;
  description: string;
  author: IUser;
  tags: string[];
  pic: IFile;
  files: IFile[];
  dependencies: IUpload[];
  meta: any;

  /**
   * Serialize as XML
   * @param {{}} options
   */
  toXML(options?: {}): any;
}

export interface IUploadModel extends PaginateModel<IUpload> {
  /**
   * Add title slugs
   * @returns {string}
   */
  slugify(): string;

  /**
   * Update the favourite count of the upload
   * @returns {IUser}
   */
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
    ref: "User"
  },
  tags: [String],
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
  timestamps: true,
  toJSON: {virtuals: true}
});

UploadSchema.plugin(mongoosePaginate);
UploadSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1"
  }
});

UploadSchema.pre("validate", function (next) {
  if (!this.slug && this.title) {
    this.slugify();
  }

  next();
});

// populate author per default
UploadSchema.pre("find", function (next) {
  this.populate({path: "author", select: "username"});
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

if (!UploadSchema.options.toObject) UploadSchema.options.toObject = {};
UploadSchema.options.toObject.transform = function (doc: IUpload, ret: any, options: {}) {
  // convert ids to plain strings
  ret._id = doc._id.toString();
  if (!doc.populated("author") && doc.author) {
    ret.author = doc.author.toString();
  }
  if (!doc.populated("pic") && doc.pic) {
    ret.pic = doc.pic.toString();
  }
  if (!doc.populated("files") && doc.files) {
    ret.files = doc.files.map((id: any) => id.toString());
  }
  if (!doc.populated("dependencies") && doc.dependencies) {
    ret.dependencies = doc.dependencies.map((id: any) => id.toString());
  }

  ret.updatedAt = (<Date>doc.updatedAt).toUTCString();
  ret.createdAt = (<Date>doc.createdAt).toUTCString();

  return ret;
};

export const Upload = mongoose.model<IUpload>("Upload", UploadSchema) as IUploadModel;
