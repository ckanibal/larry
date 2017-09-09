import mongoose = require("mongoose");
import { IUserModel } from "./User";
import { IUploadModel } from "./Upload";

interface IComment {
  body: string;
  author: IUserModel;
  upload: IUploadModel;
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

export interface ICommentModel extends IComment, mongoose.Document { }
export default mongoose.model<ICommentModel>("Comment", CommentSchema);
