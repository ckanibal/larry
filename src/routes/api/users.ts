// routes/api/users.ts

import express = require("express");

import { paginationParams } from "../../concerns/Validator";
import { User, IUser } from "../../models/User";

const router = express.Router();


/**
 * Users Controller
 */

router.get("/", paginationParams, function (req: express.Request, res: express.Response, next: express.NextFunction) {
  const {query: {limit: _limit = "50", _sort = {createdAt: -1}, _query = {}, page: _page = "1"}} = req;

  User.paginate(_query, {page: +_page, limit: +_limit, sort: _sort}, function (err, result) {
    if (err) {
      next(err);
    } else {
      res.json(result.docs);
    }
  });
});

router.post("/", function (req, res, next) {
  const user = new User(req.body.user);
  user.setPassword(req.body.user.password);

  user.save().then(function () {
    return res.json({user: user.toObject()});
  }).catch(next);
});

export = router;
