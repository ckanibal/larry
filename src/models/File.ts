import mongoose = require("mongoose");
import * as fs from "fs";
import { Readable } from "stream";

import * as crypto from "crypto";
import * as blake2 from "blake2";


interface IFile {
  filename: string;
}

const FileSchema = new mongoose.Schema({
  length: {
    type: Number
  },
  chunkSize: {
    type: Number
  },
  uploadDate: {
    type: Date
  },
  md5: {
    type: String
  },
  filename: {
    type: String
  },
  contentType: {
    type: String
  },
  aliases: [{
    type: String
  }],
  metadata: {
    type: mongoose.SchemaTypes.Mixed
  },
}, {
  collection: "fs.files"
});

FileSchema.methods.hashify = function() {
  return new Promise((resolve, reject) => {
    const readstream = mongoose.gfs.createReadStream({
      _id: this.id,
    });
    const sha1 = crypto.createHash("sha1");
    const blake2b = blake2.createHash("blake2b");

    readstream.on("error", reject);
    readstream.on("data", (chunk: Buffer) => {
      sha1.update(chunk);
      blake2b.update(chunk);
    });
    readstream.on("end", () => {
      this.model("File").findByIdAndUpdate(this._id, {
        $set: {
          metadata: {
            hashes: {
              sha1: sha1.digest("hex"),
              blake2b: blake2b.digest("hex"),
              md5: this.md5,
            }
          }
        }
      }, { new: true }, (err: Error, doc: mongoose.Document) => {
        if (err) {
          reject(err);
        }
        resolve(doc);
      });
    });
  });
};

FileSchema.methods.createReadStream = function() {
  return mongoose.gfs.createReadStream({
    _id: this.id,
  });
};

FileSchema.statics.uploadFromFs = function (file: any) {
  return new Promise((resolve, reject) => {
    const gridStream = mongoose.gfs.createWriteStream({
      filename: file.originalname,
      content_type: file.mimetype,
    });
    fs.createReadStream(file.path).pipe(gridStream);

    gridStream.on("error", reject);
    gridStream.on("close", (file: any) => {
      this.findById(file._id, function (err: Error, doc: mongoose.Document) {
        if (err) {
          reject(err);
        }
        resolve(doc);
      });
    });
  });
};

export interface IFileModel extends IFile, mongoose.Document {
  createReadStream(file: any): Readable;
  uploadFromFs(file: any): Promise<IFileModel>;
  hashify(): Promise<IFileModel>;
}

const model = mongoose.model<IFileModel>("File", FileSchema);
export default <typeof model & IFileModel>model;
