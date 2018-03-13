// src/models/FSStorage.ts
import { Storage } from "./Storage";
import { PassThrough, Readable, Transform, Writable } from "stream";
import { File, IFile } from "./File";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

const STORAGE_DIR = process.env.STORAGE_DIR || "tmp/uploads";

export class FSStorage implements Storage {
  async store(file: any): Promise<Writable> {
    const {originalname: filename, mimetype: contentType, size: length} = file;
    const fileEntry = await File.create({ filename, contentType, length });

    // evil hack to emit close-event with additional information
    const md5 = crypto.createHash("md5");
    const endTransform = new Transform({
      async transform(chunk, encoding, callback) {
        md5.update(chunk);
        this.push(chunk);
        callback();
      },
      async flush(callback) {
        fileEntry.md5 = md5.digest("hex");
        this.emit("close", await fileEntry.save());
        callback();
      }
    });

    endTransform.pipe(fs.createWriteStream(path.join(STORAGE_DIR, fileEntry.id), {
      flags: "wx",
    }));
    return endTransform;
  }

  async retrieve(file: IFile): Promise<Readable> {
    try {
      const p = path.join(STORAGE_DIR, file.id);
      return new Promise<Readable>((resolve, reject) => {
        fs.access(p, fs.constants.R_OK, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(fs.createReadStream(p));
          }
        });
      });
    } catch (e) {
      const err = new Error(e);
      err.status = 500;
      throw err;
    }
  }
}
