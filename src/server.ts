// server.ts

import * as express from "express";
import * as cors from "cors";
import * as logger from "morgan";
import * as bodyParser from "body-parser";
import * as cookieParser from "cookie-parser";
import * as expressValidator from "express-validator";
import * as httpStatus from "http-status";
import * as errorHandler from "errorhandler";


import routes = require("./routes");
import _ = require("lodash");

require("./config/passport");


/**
 * Server class
 */
export class Server {

  public app: express.Application;

  /**
   * Default constructor
   */
  constructor() {
    // create expressjs application
    this.app = express();

    // configure application
    this.config();

    // add routes
    this.routes();

    // add middleware
    this.middleware();

    // add error handler
    this.errorHandler();
  }

  private config(): void {
    /**
     * Mongoose configuration
     */

    /**
     * Create express server
     */
    this.app = express();

    /**
     * Express configuration
     */
    this.app.disable("x-powered-by");
    this.app.set("port", process.env.PORT || 3000);
    this.app.set("view engine", "pug");
    this.app.set("views", "./views/html");
    this.app.locals.basedir = this.app.get("views");
    this.app.locals.appdir = process.env.APPDIR || "";
    this.app.use(logger("dev"));
    this.app.use(cors());
    this.app.use("/assets", express.static("./views/assets"));
    this.app.use(cookieParser());
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({ extended: true }));
    this.app.use(expressValidator({
      customValidators: {
        gte: function (param, num) {
          return param >= num;
        },
      }
    }));
  }

  private middleware(): void {
    /**
     * register content renders
     */


    /**
     * Content negotiation (html/json/xml)
     */
    // this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
    //   if (res.body) {
    //     res.format({
    //       "text/html": () => {
    //         res.render()
    //       },
    //       "application/xml": () => {
    //         res.send(res.body.toXml());
    //       },
    //       "application/json": () => {
    //         res.send(res.body.toJSON());
    //       },
    //       "default": () => {
    //         res.status(httpStatus.NOT_ACCEPTABLE).send("Not acceptable");
    //       }
    //     });
    //   }
    //   next();
    // });
  }

  /**
   * Setup routes
   */
  private routes(): void {
    this.app.use(routes);
  }

  /**
   * Handle errors
   */
  private errorHandler(): void {
    this.app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.format({
        html: function() {
          res.status(err.status || httpStatus.INTERNAL_SERVER_ERROR);
          next(err);
        },
        json: function() {
          res.status(err.status || httpStatus.INTERNAL_SERVER_ERROR).send(_.pick(err, ["status", "message"]));
          next(err);
        }
      });
    });
    this.app.use(errorHandler());
  }

  /**
   * Start express server
   */
  public run(): void {
    this.app.listen(this.app.get("port"), () => {
      console.log(("  App is running at http://localhost:%d in %s mode"), this.app.get("port"), this.app.get("env"));
      console.log("  Press CTRL-C to stop\n");
    });
  }
}

new Server().run();
