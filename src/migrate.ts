// migrate.ts

/**
 * Bootstrap migration process
 */

import * as path from "path";
import migrate = require("migrate");
import { MigrationSet } from "migrate";

migrate.load({
  stateStore: ".migrate",
  migrationsDirectory: path.join(__dirname, "models/migrations"),
  filterFunction: function(file: string) { return [".js"].includes(path.extname(file)); },
}, function (err: Error, set: MigrationSet) {
  if (err) {
    throw err;
  }
  set.up(function (err: Error) {
    if (err) {
      throw err;
    }
    console.log("migrations successfully ran");
    process.exit(0);
  });
});
