// models/Comment.ts

import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel } from "mongoose";
import mongoosePaginate = require("mongoose-paginate");
import { votingPlugin, Votable } from "../concerns/Voting";

import { IUser } from "./User";
import { IUpload } from "./Upload";

export interface IComment extends Document, Votable {
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
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Upload",
    required: true
  }
}, {
  timestamps: true
});
CommentSchema.plugin(mongoosePaginate);
CommentSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1 (at least for now)"
  }
});


export const Comment = mongoose.model<IComment>("Comment", CommentSchema) as ICommentModel;
