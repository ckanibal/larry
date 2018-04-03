// models/Tag.ts

import slug = require("slug");
import * as assert from "assert";
import { Schema, Model, Document } from "mongoose";
import * as _ from "lodash";

import { mongoose } from "../config/database";
import { IUser } from "./User";
import { IVote, Vote } from "./Vote";
import update = require("lodash/fp/update");

/**
 * Tag Model
 */

export interface ITag {
  text: string;
  slug: string;
  author: IUser;
}


export const TagSchema = new mongoose.Schema({
  text: {
    type: Schema.Types.String,
    minlength: 2,
    maxlength: 32,
    match: /^[\S{2,}]/,
    required: true,
    index: true,
  },
  slug: {
    type: Schema.Types.String,
    required: true,
    index: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
}, {
  strict: true,
  timestamps: false
});

TagSchema.pre("validate", function (next: Function) {
  if (this.text && !this.slug) {
    this.slugify();
  }

  next();
});

TagSchema.methods.slugify = function () {
  slug.defaults.mode = "rfc3986";
  this.slug = slug(this.text);
};

TagSchema.set("toObject", {
  transform: function (doc: Document, ret: ITag, options: {}) {
    return _.pick(ret, ["_id", "text", "slug"]);
  }
});

export interface Taggable extends Document {
  tags: ITag[];

  tag(tag: ITag): void;
}

export function taggablePlugin<UserType extends Document>
(schema: Schema, options: { validate?: { validator: Function, message?: string } } = {validate: {validator: () => true}}) {
  schema.add({
    tags: {
      type: [TagSchema]
    },
  });

  schema.methods.tag = function(tag: ITag) {
    // ensure tag is unique
    assert (!this.tags.some((t: ITag) => t.slug == tag.slug || t.text == tag.text), "Tag must be unique!");
    this.tags.push(tag);
    return this.save();
  }
}
