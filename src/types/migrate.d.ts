declare module "migrate" {
  declare function load(options: {}, fn: Function);

  declare interface MigrationSet {
    up(fn: Function): void;
    down(fn: Function): void;
  }
}
