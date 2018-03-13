// models/File.ts
import { Schema, PaginateModel, Document } from "mongoose";
import { mongoose } from "../config/database";
import * as fs from "fs";
import { Readable } from "stream";
import * as crypto from "crypto";
import { IUser } from "./User";
import { GridFSStorage } from "./GridFSStorage";
import { Hash, HexBase64Latin1Encoding } from "crypto";
import { FSStorage } from "./FSStorage";

const storage = new GridFSStorage();
// const storage = new FSStorage();

export interface IFile extends Document {
  author: IUser;
  length: number;
  chunkSize: number;
  uploadDate: Date;
  md5: string;
  filename: string;
  contentType: string;
  aliases: string[];
  metadata: {};
}

export interface IFileModel extends PaginateModel<IFile> {
  upload(file: {}, options: {}): Promise<IFile>;

  createReadStream(file: any): Readable;
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
  author: {
    type: Schema.Types.ObjectId,
    ref: "User"
  },
}, {
  collection: "fs.files",
  strict: false,
});

// FileSchema.methods.hashify = function () {
//   return new Promise((resolve, reject) => {
//     const readstream = mongoose.gfs.createReadStream({
//       _id: this.id,
//     });
//     const sha1 = crypto.createHash("sha1");
//     let blake2b: any = undefined;
//     try {
//       blake2b = crypto.createHash("blake2b") || require("blake2").createHash("blake2b");
//     } catch {
//       console.warn("No working blake2b implementation found.");
//     }
//     readstream.on("error", reject);
//     readstream.on("data", (chunk: Buffer) => {
//       sha1.update(chunk);
//       if (blake2b) blake2b.update(chunk);
//     });
//     readstream.on("end", () => {
//       const hashes = {};
//       Object.assign(hashes,
//         {md5: this.md5},
//         {sha1: sha1.digest("hex")},
//         blake2b ? {blake2b: blake2b.digest("hex")} : undefined
//       );
//       this.model("File").findByIdAndUpdate(this._id, {
//         $set: {
//           metadata: {
//             hashes
//           }
//         }
//       }, {new: true}, (err: Error, doc: mongoose.Document) => {
//         if (err) {
//           reject(err);
//         }
//         resolve(doc);
//       });
//     });
//   });
// };

/**
 * Calculates multiple hashes with a consistent interface
 */
class MultiHash {
  private _hashes: Map<string, Hash>;

  constructor(...hashes: string[]) {
    this._hashes = new Map<string, Hash>();
    for (const hash of hashes) {
      try {
        const h = crypto.createHash(hash) || require(hash).createHash(hash);
        this._hashes.set(hash, h);
      } catch (e) {
        console.warn("No suitable implementation available for hash", hash);
      }
    }
  }

  update(data: string | Buffer): MultiHash {
    for (const hash of this._hashes.values()) {
      hash.update(data);
    }
    return this;
  }

  digest(encoding: HexBase64Latin1Encoding = "hex"): Object {
    return [...this._hashes.entries()].reduce(function (result: any, [hash, h]: [string, Hash]) {
      result[hash] = h.digest(encoding);
      return result;
    }, {});
  }
}

const HASHES = ["sha1", "blake2b"];
FileSchema.statics.upload = async function (file: any, {hashes = false}: { hashes: boolean }) {
  return new Promise(async (resolve, reject) => {
    const writeStream = await storage.store(file);
    const hashList = hashes ? HASHES : [];
    const multihash = new MultiHash(...hashList);

    fs.createReadStream(file.path)
      .on("data", (chunk: Buffer) => {
        multihash.update(chunk);
      })
      .on("error", reject)
      .pipe(writeStream);

    writeStream.on("error", reject);
    writeStream.on("close", (file: IFile) => {
      const hashes = multihash.digest();
      const metadata = {hashes};

      this.findByIdAndUpdate(file._id, {
        $set: {
          metadata
        }
      }, {new: true}, (err: Error, file: IFile) => {
        if (err) {
          reject(err);
        }
        resolve(file);
      });
    });
  });
};

FileSchema.methods.createReadStream = async function (): Promise<Readable> {
  return await storage.retrieve(this);
};

export const File = mongoose.model<IFile>("File", FileSchema) as IFileModel;
