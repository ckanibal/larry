import { Document, Schema, Types } from "mongoose";
import * as util from "util";
import xmlbuilder = require("xmlbuilder");
import pluralize = require("pluralize");

import { Link, LinkRel } from "./Link";


export abstract class Resource {
  protected _links: Link[];
  get links(): Link[] {
    return this._links;
  }

  set links(newLinks: Link[]) {
    this._links = newLinks;
  }

  get title(): string {
    return this.links.find(l => l.rel == LinkRel.Self).title;
  }

  constructor() {
    this._links = new Array<Link>();
  }

  /**
   *
   */
  toJSON({pretty}: { pretty?: string }): string {
    let indentLevel: number = 0;
    if (pretty !== undefined) {
      indentLevel = parseInt(pretty) || 2;
    }
    return JSON.stringify(this.toObject(), undefined, indentLevel);
  }

  /**
   * Converts a object to XML
   * @returns {string}
   */
  toXml(title: string = this.title): string {
    const xml = xmlbuilder
      .create(title, {
        separateArrayItems: false,
      })
      .ele(this.toObject({replaceKeys: true, wrapArrays: false, xml: true}))
      .end();
    return xml;
  }

  protected objectify(value: any, {replaceKeys = false, wrapArrays = false} = {}) {
    if (!util.isPrimitive(value)) {
      // console.log("non primitive:", value, "type:", typeof value);
      if (value instanceof Types.ObjectId || value instanceof Schema.Types.ObjectId) {
        value = value.toString();
      } else if (value instanceof Date) {
        value = value.toISOString();
      } else if (util.isArray(value)) {
        value = value.map((val: any) => this.objectify(val, {replaceKeys, wrapArrays}));
      } else if (util.isBuffer(value)) {
        value = value.toString("hex");
      } else {
        value = Object.entries(value).map(([key, value]) => {
          if (replaceKeys) {
            key = key.replace(/^_/, "@");
          }
          if (util.isArray(value)) {
            key = pluralize.singular(key);
          }
          if (wrapArrays && util.isArray(value)) {
            value = value.map((val: any) => ({[pluralize.singular(key)]: val} ));
          }
          value = this.objectify(value);
          return {[key]: value};
        }).reduce((acc, obj) => Object.assign(acc, obj), {});
      }
      // console.log(" => resolved: ", value);
    }
    return value;
  }

  toObject({replaceKeys = false, wrapArrays = false, xml = false} = {}) {
    // prepare links
    const _links = this.links.filter(l => l)
      .map(link => ({
        [link.rel]: {
          title: link.title,
          href: link.href,
        }
      }))
      .reduce((acc, cur) => Object.assign(acc, cur), {});

    return {_links};
  }
}


/**
 *
 */
export class DocumentResource extends Resource {
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
  toObject(options?: Object) {
    const resource = super.toObject();
    const doc = this.objectify(this._doc.toObject(), options);
    return Object.assign(resource, doc);
  }
}

export class CollectionResource extends Resource {
  protected _meta: any;

  get meta(): any {
    return this._meta;
  }

  set meta(newMeta: any) {
    this._meta = newMeta;
  }

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
  toObject({replaceKeys = false, wrapArrays = false, xml = false} = {}) {
    const resource = super.toObject();

    // children
    const children = this._res.map(res => res.toObject({replaceKeys, wrapArrays}));

    /*
     if (wrapArrays) {
     children = children.map (child => ({ [pluralize.singular(this.title)]: child}));
     }
     */

    return Object.assign(resource, {
      _meta: this._meta,
      [xml ? pluralize.singular(this.title) : this.title]: children,
    });
  }
}

export class ObjectResource extends Resource {
  /**
   *
   * @param _obj
   */
  constructor(private _obj: Object, ...links: Link[]) {
    super(_obj, ...links);
    this._links.push(...links);
  }

  /**
   * Serialize object
   */
  toObject(options: Object) {
    const resource = super.toObject(options);
    return Object.assign(resource, this.objectify(this._obj, options));
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
