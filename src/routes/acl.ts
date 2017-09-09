import mongoose = require("mongoose");
import acl = require("acl");

const acls = new acl(new acl.mongodbBackend(mongoose.connection.db, "acl_"));
export = acls;
