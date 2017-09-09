/**
 *
 */

export enum LinkRel {
  Parent = "parent",
  Collection = "collectiom",
  Self = "self",
  Next = "next",
  Prev = "prev",
  Last = "last",
}

export class Link {
  /**
   *
   * @param href
   * @param title
   * @param rel
   */
  constructor(private _href?: string, private _title?: string, private _rel?: LinkRel) {
  }

  get href(): string { return this._href; }
  set href(newHref: string) { this._href = newHref; }

  get title(): string { return this._title; }
  set title(newTitle: string) { this._title = newTitle; }

  get rel(): LinkRel { return this._rel; }
  set rel(newRel: LinkRel ) { this._rel = newRel; }

  /**
   *
   * @returns {{href: string, title: string}}
   */
  public toObject(): any {
    return {
      rel: this.rel,
      href: this.href,
      title: this.title,
    };
  }
}
