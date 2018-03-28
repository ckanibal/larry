import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel } from "mongoose";

import mongoosePaginate = require("mongoose-paginate");
import slug = require("slug");
import * as xmlbuilder from "xmlbuilder";


import { User, IUser } from "./User";
import { File, IFile } from "./File";
import { ITag, Tag, TagSchema } from "./Tag";

import { votingPlugin, Votable } from "./Vote";
import { Types } from "mongoose";

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
  // remove the _id of every document before returning the result
  delete ret._id;
  return ret;
};

UploadSchema.methods.toXML = function (options?: { href: string, root: string }) {
  return xmlbuilder.create((options && options.root) || "resource")
    .att("title", "upload")
    .att("href", (options && options.href) || "")
    .ele("created_at", new Date(this.createdAt).toUTCString()).up()
    .ele("updated_at", new Date(this.updatedAt).toUTCString()).up()
    .ele("_id", this.id).up()
    .ele("slug", this.slug).up()
    .ele("title", this.title).up()
    .ele("description", this.description).up()
    .ele({"author": this.populated("author") ? this.author.toObject(options) : this.author.toString()}).up()
    .ele("tags")
    .ele({tag: this.tags.map((t: any) => (this.populated("tags") ? t.toObject(options) : t.toString()))}).up()
    .up()
    .ele({"pic": this.populated("pic") ? this.pic.toObject(options) : this.pic.toString()}).up()
    .ele("files")
    .ele({file: this.files.map((file: any) => (this.populated("files") ? file.toObject(options) : file.toString()))}).up();
};

export const Upload = mongoose.model<IUpload>("Upload", UploadSchema) as IUploadModel;
