// models/Tag.ts

import slug = require("slug");
import { Schema, Model, Document } from "mongoose";
import { mongoose } from "../config/database";
import { votingPlugin, Votable } from "../concerns/Voting";
import { IUser } from "./User";
import { IUpload } from "./Upload";

/**
 * Tag Model
 */

export interface ITag extends Document, Votable {
  text: string;
  slug: string;
  author: IUser;
  upload: IUpload;
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
  slug: {
    type: Schema.Types.String
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
  upload: {
    type: Schema.Types.ObjectId,
    ref: "Upload"
  },
}, {
  timestamps: true
});

TagSchema.pre("validate", function (next) {
  if (!this.slug) {
    this.slugify();
  }

  next();
});

TagSchema.methods.slugify = function () {
  this.slug = slug(this.text);
};

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
