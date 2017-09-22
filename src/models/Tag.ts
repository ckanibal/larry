// models/Tag.ts

import { Schema, Model, Document } from "mongoose";
import { mongoose } from "../config/database";

/**
 * Tag Model
 */

export interface ITag extends Document {
  tag: string;
  author: {};
  upload: {};
}

export interface ITagModel extends Model<ITag> {

}


const TagSchema = new mongoose.Schema({
  tag: String,
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

export const Tag = mongoose.model<ITag>("Tag", TagSchema) as ITagModel;
