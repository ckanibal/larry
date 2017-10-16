import { Router } from "express";
import acl = require("../acl");


const router = Router();

// router.use("/profiles", require("./profiles"));
router.use("/media", require("./media"));
router.use("/uploads", require("./uploads"));
router.use("/users", require("./users"));
router.use("/user", require("./user"));
router.use("/votes", require("./votes"));
// router.use("/tags", require("./tags"));

/*
router.use(function(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
  if (err.name === "ValidationError") {
    return res.status(422).json({
      error: err
    });
  }

  return next(err);
});
*/

export = router;
