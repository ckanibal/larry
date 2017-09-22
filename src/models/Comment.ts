// models/Comment.ts

import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel } from "mongoose";
import mongoosePaginate = require("mongoose-paginate");

import { IUser } from "./User";
import { IUpload } from "./Upload";

export interface IComment extends Document {
  body: string;
  author: IUser;
  upload: IUpload;
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
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Upload"
  }
}, {
  timestamps: true
});
CommentSchema.plugin(mongoosePaginate);

export const Comment = mongoose.model<IComment>("Comment", CommentSchema) as ICommentModel;
