// models/mongoose.ts
import * as mongoose from "mongoose";
import Grid = require("gridfs-stream");

/**
 * Provides the default mongoose connection
 */

(<any>mongoose).Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI, {
  useMongoClient: true,
}).then(function () {
  (<any>mongoose).gfs = Grid(mongoose.connection.db, mongoose.mongo);
})
  .catch((err: Error) => {
    console.error("Could not connect to database: ", err);
    process.exit(-1);
  });

export { mongoose };
