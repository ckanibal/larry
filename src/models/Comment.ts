// models/Comment.ts

import { mongoose } from "../config/database";
import { Schema, Document, PaginateModel, DocumentToObjectOptions } from "mongoose";
import mongoosePaginate = require("mongoose-paginate");
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
CommentSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1"
  }
});

// populate author per default
CommentSchema.pre("find", function (next) {
  this.populate({path: "author", select: "username"});
  next();
});


export const Comment = mongoose.model<IComment>("Comment", CommentSchema) as ICommentModel;
