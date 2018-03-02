// routes/GenericController.ts
import { Request, Response, NextFunction, Router } from "express";
import { PaginateModel, Document } from "mongoose";
import { paginationParams as verifyPagination } from "../concerns/Validator";
import auth = require("../config/auth");


interface PaginationParameters {
  limit: number;
  page: number;
  sort: {};
  query: {};
}

export class GenericController<T extends Document> {
  private _model: PaginateModel<T>;
  private _modelName: string;
  private _key: string;
  private _instance: T;

  public constructor(model: PaginateModel<T>, key: string) {
    this._model = model;
    this._modelName = model.modelName.toLowerCase();
    this._key = key;
  }

  public list({query, ...params}: PaginationParameters = {limit: 50, page: 1, sort: {}, query: {}}) {
    return this._model.paginate(query, { ...params });
  }

  public create(obj: T) {
    const doc = new this._model(obj);
    return doc.save();
  }

  public read(key: string) {
    return this._model.findOne({ [this._key]: key });
  }

  public router() {
    const router = Router();

    // index route
    router.get("/", auth.optional, verifyPagination, function (req: Request, res: Response, next: NextFunction) {
      this.list(req.query).then((docs: T[]) => {
        res.json(docs);
      }).catch(next);
    });

    // create route


    // key-Parameter
    router.param(":key", function (req: Request, res: Response, next: NextFunction, key: string) {
      this.read(key).then((doc: T) => {
        this._instance = doc;
        next();
      }).catch(next);
    });

    // read route
    router.get("/:key", auth.optional, function (req: Request, res: Response, next: NextFunction) {
      res.json(this._instance);
    });

    // delete route
    router.delete("/:key", auth.required, function (req: Request, res: Response, next: NextFunction) {
      this._instance.remove().then(() => {
        res.sendStatus(httpStatus.NO_CONTENT);
      }).catch(next);
    });
  }
}
