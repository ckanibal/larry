// routes/api/index.ts

import { Router } from "express";


const router = Router();

// router.use("/profiles", require("./profiles"));
router.use("/auth", require("./auth"));
router.use("/media", require("./media"));
router.use("/uploads", require("./uploads"));
router.use("/users", require("./users"));
router.use("/user", require("./user"));
router.use("/votes", require("./votes"));

export = router;
