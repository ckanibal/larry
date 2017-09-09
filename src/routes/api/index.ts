import express = require("express");
import acl = require("../acl");
const router = express.Router();

router.use("/", require("./users"));
// router.use("/profiles", require("./profiles"));
router.use("/uploads", require("./uploads"));
// router.use("/tags", require("./tags"));

router.use(function(err: Error, req: express.Request, res: express.Response, next: express.NextFunction) {
  if (err.name === "ValidationError") {
    return res.status(422).json({
      error: err
    });
  }

  return next(err);
});

export = router;
