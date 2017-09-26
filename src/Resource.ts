import { Document, Schema, Types } from "mongoose";
import * as util from "util";
import xmlbuilder = require("xmlbuilder");

import { Link, LinkRel } from "./Link";


export abstract class Resource {
  protected _links: Link[];
  get links(): Link[] { return this._links; }
  set links(newLinks: Link[]) { this._links = newLinks; }

  get title(): string {
    return this.links.find(l => l.rel == LinkRel.Self).title;
  }

  constructor() {
    this._links = new Array<Link>();
  }

  /**
   *
   */
  toJSON({ pretty }: { pretty?: string }): string {
    let indentLevel: number = 0;
    if (pretty !== undefined) {
      indentLevel = parseInt(pretty) || 2;
    }
    return JSON.stringify (this.toObject(), undefined, indentLevel);
  }

  /**
   * Converts a object to XML
   * @returns {string}
   */
  toXml(): string {
    const xml = xmlbuilder
      .create(this.title, {
        stringify: {
        }
      })
      .ele(this.toObject())
      .end();
    return xml;
  }

  protected toObject() {
    // prepare links
    const _links = this.links.filter(l => l)
      .map(link => ({
        [link.rel]: {
          title: link.title,
          href: link.href,
        }
      }))
      .reduce((acc, cur) => Object.assign(acc, cur), {});

    return { _links };
  }
}


/**
 *
 */
export class DocumentResource extends Resource {

  /**
   *
   */
  protected _children?: DocumentResource[];
  get children(): DocumentResource[] { return this._children; }
  set children(newChildren: DocumentResource[]) { this._children = newChildren; }

  /**
   *
   * @param _doc
   * @param ...links
   */
  constructor(private _doc: Document, ...links: Link[]) {
    super();
    this._links.push(...links);
  }

  /**
   *
   */
  toObject() {
    const resource = super.toObject();

    function objectify (obj: Object) {
      // console.log("objectify", obj, typeof obj);
      return Object.entries(obj).map(([key, value]) => {
        key = key.replace(/^_/, "@");
        if (!util.isPrimitive(value)) {
          // console.log("non primitive:", key, value, "type:", typeof value);
          if (value instanceof Types.ObjectId) {
            value = value.toString();
          } else if (value instanceof Date) {
            value = value.toISOString();
          } else if (util.isArray(value)) {
            value = value.map(objectify);
          } else {
            value = objectify(value);
          }
          // console.log(" => resolved: ", value);
        }
        return { [key]: value };
      }).reduce((acc, obj) => Object.assign(acc, obj));
    }

    const doc = objectify(this._doc.toObject());
    return Object.assign(resource, doc);
  }
}

export class CollectionResource extends Resource {
  protected _meta: any;
  get meta(): any { return this._meta; }
  set meta(newMeta: any) { this._meta = newMeta; }

  /**
   *
   * @param _doc
   * @param _title
   * @param _href
   * @param _itemTitle
   */
  constructor(private _res: DocumentResource[], ...links: Link[]) {
    super();
    this._links.push(...links);
  }

  /**
   *
   */
  toObject() {
    const resource = super.toObject();

    // children
    const children = this._res.map(res => res.toObject());

    return Object.assign(resource, {
      _meta: this._meta,
      [this.title]: children,
    });
  }
}

/**
 *
 */
export class ErrorResource extends Resource {
  /**
   *
   * @param error
   */
  constructor(private error: Error) {
    super();
  }

  /**
   *
   */
  toJSON(): string {
    return "";
  }

  /**
   *
   */
  toXml(): string {
    return "";
  }
}
