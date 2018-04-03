// migrations/1522710592700-update-tags.ts
import { IUpload, IUploadModel, Upload } from "../Upload";
import { Schema } from "mongoose";
import { mongoose } from "../../config/database";


export async function up(next: Function) {
  const oldSchema = new Schema({
    author: {
      type: Schema.Types.ObjectId,
      ref: "User"
    },
    tags: [String]
  }, {strict: false, collection: "uploads"});

  const model = mongoose.model("MigrateUpload", oldSchema);

  const cursor = model.find({}).cursor();
  // we would like to use async generators here;
  // however it is not possible atm because we have no implementation of Symbol.asyncIterator
  await cursor.eachAsync(async (doc: any) => {
    const upload = await Upload.findById(doc.id);
    upload.tags = doc.tags.map((tag: any) => ({
      text: tag,
      author: doc.author
    }));
    await upload.save();
  });
  next();
}

export async function down(next: Function) {

}
