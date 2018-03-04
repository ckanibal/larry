// routes/index.ts

import express = require("express");
import { UploadController } from "./uploads/UploadController";
import { CommentController } from "./comments/CommentController";
import { AuthController } from "./authentication/AuthController";
import { MediaController } from "./media/MediaController";
import { BaseController } from "./BaseController";
import auth = require("../config/auth");

const router = express.Router();
// router.use("/api", require("./api"));
router.use("/", new BaseController().router);
router.use("/auth", new AuthController().router);
router.use("/media", new MediaController().router);
router.use("/uploads", new UploadController().router);
router.use("/comments", new CommentController().router);
export = router;
