// models/Tag.ts

import { Schema, Model, Document } from "mongoose";
import { mongoose } from "../config/database";
import { votingPlugin, Votable } from "../concerns/Voting";

/**
 * Tag Model
 */

export interface ITag extends Document, Votable {
  text: string;
  author: {};
  ref: {
    model: string,
    document: Document,
  };
}

export interface ITagModel extends Model<ITag> {

}


export const TagSchema = new mongoose.Schema({
  text: {
    type: Schema.Types.String,
    minlength: 3,
    maxlength: 32,
    match: /^\w/,
    required: true,
    index: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  ref: {
    model: Schema.Types.String,
    document: {
      type: Schema.Types.ObjectId,
      refPath: "ref.model",
      required: true
    },
  },
}, {
  timestamps: true
});

TagSchema.set("toObject", {
  transform: function(doc: Document, ret: ITag, options: {}) {
    delete ret.author;
    return ret;
  }
});

TagSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1 (at least for now)"
  }
});

export const Tag = mongoose.model<ITag>("Tag", TagSchema) as ITagModel;
