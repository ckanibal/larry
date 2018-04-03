// models/Comment.ts

import { mongoose } from "../config/database";
import { Schema, Document, PaginateModel, DocumentToObjectOptions } from "mongoose";
import mongoosePaginate = require("mongoose-paginate");
import mongooseDelete = require("mongoose-delete");
import { votingPlugin, Votable } from "./Vote";

import { IUser } from "./User";
import { IUpload } from "./Upload";

export interface IComment extends Document, Votable {
  body: string;
  author: IUser;
  upload: IUpload;

  toJSON(options?: DocumentToObjectOptions): Object;
}

export interface ICommentModel extends PaginateModel<IComment> {
  // tbd.
}

const CommentSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  upload: {
    type: Schema.Types.ObjectId,
    ref: "Upload",
    required: true,
    index: true,
  }
}, {
  toJSON: { virtuals: true },
  timestamps: true
});
CommentSchema.plugin(mongoosePaginate);
CommentSchema.plugin(mongooseDelete);
CommentSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1"
  }
});

// populate author per default
CommentSchema.pre("find", function (next: Function) {
  this.populate({path: "author", select: "username"});
  next();
});

if (!CommentSchema.options.toObject) CommentSchema.options.toObject = {};
CommentSchema.options.toObject.transform = function (doc: IComment, ret: any, options: { xml: boolean }) {
  // convert ids to plain strings
  ret._id = doc._id.toString();
  if (!doc.populated("author") && doc.author) {
    ret.author = doc.author.toString();
  }
  if (!doc.populated("upload") && doc.upload) {
    ret.upload = doc.upload.toString();
  }

  if (options && options.xml == true) {
    ret.body = {"#cdata": doc.body};
  }

  ret.updatedAt = (<Date>doc.updatedAt).toISOString();
  ret.createdAt = (<Date>doc.createdAt).toISOString();

  return ret;
};


export const Comment = mongoose.model<IComment>("Comment", CommentSchema) as ICommentModel;
