import mongoose = require("mongoose");

import Voting = require("./Voting");
import { IUserModel } from "./User";
import { IUploadModel } from "./Upload";


interface ITag {
  tag: string;
  author: IUserModel;
  upload: IUploadModel;
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
TagSchema.plugin(Voting);

export interface ITagModel extends ITag, mongoose.Document { }
export default mongoose.model<ITagModel>("Tag", TagSchema);
