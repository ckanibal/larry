import { Readable, Writable } from "stream";
import { IFile } from "./File";

export interface Storage {
  store(file?: any): Promise<Writable>;
  retrieve(file: IFile): Promise<Readable>;
}
