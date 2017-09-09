import express = require("express");

const router = express.Router();
router.use("/api", require("./api"));
export = router;
