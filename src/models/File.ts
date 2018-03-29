// models/File.ts
import { Schema, PaginateModel, Document } from "mongoose";
import { mongoose } from "../config/database";
import * as fs from "fs";
import { Readable } from "stream";
import * as crypto from "crypto";
import { IUser } from "./User";
import { GridFSStorage } from "./GridFSStorage";
import { Hash, HexBase64Latin1Encoding } from "crypto";

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

  /**
   * Retrieves a Readable stream from the storage engine
   * @param file
   * @returns {"stream".internal.Readable}
   */
  createReadStream(file: any): Readable;
}

export interface IFileModel extends PaginateModel<IFile> {
  upload(file: {}, options: {}): Promise<IFile>;
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

if (!FileSchema.options.toObject) FileSchema.options.toObject = {};
FileSchema.options.toObject.transform = function (doc: IFile, ret: any, options: {}) {
  // convert ids to plain strings
  ret._id = doc._id.toString();
  if (!doc.populated("author") && doc.author) {
    ret.author = doc.author.toString();
  }

  ret.uploadDate = (<Date>doc.uploadDate).toUTCString();
  return ret;
};

export const File = mongoose.model<IFile>("File", FileSchema) as IFileModel;
