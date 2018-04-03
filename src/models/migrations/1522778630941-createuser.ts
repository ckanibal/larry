// migrations/1522710592700-update-tags.ts
import { User } from "../User";
import { mongoose } from "../../config/database";


export async function up(next: Function) {
  const user = new User({
    username: "admin",
    email: "admin@admin.local",
    role: "admin",
  });
  user.setPassword("admin");
  await user.save();
  next();
}

export async function down(next: Function) {

}
