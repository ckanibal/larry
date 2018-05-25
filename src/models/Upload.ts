import { mongoose } from "../config/database";
import { Schema, Model, Document, PaginateModel, Types, DocumentToObjectOptions } from "mongoose";
import mongoosePaginate = require("mongoose-paginate");
import mongooseDelete = require("mongoose-delete");
import uniqueValidator = require("mongoose-unique-validator");
import slug = require("slug");
import * as path from "path";
import { ITag, Taggable, taggablePlugin, TagSchema } from "./Tag";
import { User, IUser } from "./User";
import { File, IFile } from "./File";
import { votingPlugin, Votable } from "./Vote";


const TAG_EXTENSIONS = [
  ".ocf", ".ocs", ".ocd", ".ocg", ".ocu", ".oci", ".ocp", ".ocm",
  ".c4f", ".c4s", ".c4d", ".c4g", ".c4u", ".c4i", ".c4p", ".c4m",
];

/**
 * Upload Model
 */
export interface IUpload extends Document, Votable, Taggable {
  slug: string;
  title: string;
  description: string;
  author: IUser;
  pic: IFile;
  files: IFile[];
  dependencies: IUpload[];
  meta: any;

  /**
   * Serialize as object
   * @param options
   */
  toObject(options?: { xml?: boolean } | DocumentToObjectOptions): any;
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
    required: true
  },
  title: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
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
  toJSON: {virtuals: true},
  toObject: {virtuals: true},
});
UploadSchema.index({title: "text", description: "text", "tags.slug": "text"});

UploadSchema.plugin(uniqueValidator);
UploadSchema.plugin(mongoosePaginate);
UploadSchema.plugin(mongooseDelete);
UploadSchema.plugin(taggablePlugin);
UploadSchema.plugin(votingPlugin, {
  validate: {
    validator: function (v: number) {
      return [-1, +1].includes(v);
    },
    message: "Vote must be +/- 1"
  }
});

UploadSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "upload",
  justOne: false
});

UploadSchema.pre("validate", function (next: Function) {
  if (!this.slug && this.title) {
    this.slugify();
  }

  next();
});

// populate author per default
UploadSchema.pre("find", function (next: Function) {
  this.populate({path: "author", select: "username"});
  next();
});

UploadSchema.methods.slugify = function () {
  slug.defaults.mode = "rfc3986";
  this.slug = slug(this.title);
};

UploadSchema.methods.updateFavoriteCount = function () {
  const upload = this;

  return User.count({favorites: {$in: [upload._id]}}).then(function (count: Number) {
    upload.favoritesCount = count;
    return upload.save();
  });
};

UploadSchema.pre("save", function (next: Function) {
  this.populate("files");
  console.log(this);
  Promise.all(this.files.map((id: mongoose.Types.ObjectId) =>
    File.findById(id,  (err, file: IFile) => {
      if (err) {
        next(err);
      } else {
        const extension = path.extname(file.filename);
        if (TAG_EXTENSIONS.includes(extension)) {
          this.tag({text: extension});
        }
      }
    })
  )).then(() => next()).catch((err) => next(err));
});

if (!UploadSchema.options.toObject) UploadSchema.options.toObject = {};
UploadSchema.options.toObject.transform = function (doc: IUpload, ret: any, options: { xml: boolean }) {
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
  if (options && options.xml == true) {
    ret.description = {"#cdata": doc.description};
  }
  if (doc.updatedAt) {
    ret.updatedAt = (<Date>doc.updatedAt).toISOString();
  }
  if (doc.createdAt) {
    ret.createdAt = (<Date>doc.createdAt).toISOString();
  }

  return ret;
};

export const Upload = mongoose.model<IUpload>("Upload", UploadSchema) as IUploadModel;
