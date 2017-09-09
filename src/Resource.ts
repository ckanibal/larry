import { Document } from "mongoose";
import { Link, LinkRel } from "./Link";
import xmlify = require("xmlify");


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
  abstract toXml(): string;

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
   * @param _title
   * @param _href
   * @param _parent
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
    return Object.assign(resource, this._doc.toObject());
  }

  toXml(): string {
    return xmlify(this._doc, this.title);
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
  toXml(): string {
    const xml = xmlify(this._res.map(res => res.toObject()), this.title);
    return xml;
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
