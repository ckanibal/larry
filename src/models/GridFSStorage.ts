// src/models/GridFSStorage.ts
import { Storage } from "./Storage";
import { Readable, Writable } from "stream";
import { IFile } from "./File";
import { mongoose } from "../config/database";

export class GridFSStorage implements Storage {
  store(file?: any): Promise<Writable> {
    return mongoose.gfs.createWriteStream({
      filename: file.originalname,
      content_type: file.mimetype,
    });
  }

  retrieve(file: IFile): Promise<Readable> {
    return mongoose.gfs.createReadStream({
      _id: file.id,
    });
  }
}
