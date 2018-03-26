import { Writable } from "stream";
import { NextFunction, Request, Response } from "express";
import httpStatus = require("http-status");

export class EventStreamSocket extends Writable {
  constructor(private req: Request, private res: Response, private next: NextFunction) {
    super();

    res.writeHead(httpStatus.OK, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive"
    });
  }

  _write(str: Buffer | string, encoding?: any, cb?: any): boolean {
    try {
      this.res.write("data: " + str.toString() + "\n\n");
      cb();
      return true;
    } catch (e) {
      this.emit("close");
      cb(e);
    }
  }
}
