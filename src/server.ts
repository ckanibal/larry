// server.ts

import * as express from "express";
import * as cors from "cors";
import * as logger from "morgan";
import * as bodyParser from "body-parser";
import * as expressValidator from "express-validator";
import * as httpStatus from "http-status";
import * as errorHandler from "errorhandler";

import routes = require("./routes");
require("./config/passport");

/**
 * Controllers (route handlers).
 */

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

    // add api
    this.api();
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
    this.app.use(logger("dev"));
    this.app.use(cors());
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

  /**
   * Setup routes
   */
  private routes(): void {
    this.app.use(routes);

    /**
     * Content negotiation (json/xml)
     */
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (res.body) {
        res.format({
          "application/xml": () => {
            res.send(res.body.toXml());
          },
          "application/json": () => {
            res.send(res.body.toJSON(req.query));
          },
          "default": () => {
            res.status(httpStatus.NOT_ACCEPTABLE).send("Not acceptable");
          }
        });
      }
      next();
    });

    /**
     * Handle errors
     */
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status = err.status || httpStatus.INTERNAL_SERVER_ERROR;
      next(err);
    });
    this.app.use(errorHandler());
  }

  /**
   * Setup api routes
   */
  api() {
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
