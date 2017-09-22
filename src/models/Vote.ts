// // models/Voting.ts
//
//
// // update vote count
// /*
// VoteSchema.pre("save", function (next) {
//   this.model(this.ref.model).findOneAndUpdate(
//     {_id: this.ref.item},
//     {
//       $inc: {"voting.sum": this.impact},
//     },
//     {safe: true},
//     (err: Error, doc: mongoose.Document, numRows: number) => {
//       if (err) {
//         next(err);
//       } else {
//         // update user reputation
//         doc.constructor.findById(doc.id).populate("author")
//           .then((item: any) => {
//             if (item.author) {
//               item.author.vote(this.author, this.impact);
//               next();
//             }
//           })
//           .catch(next);
//         next();
//       }
//     });
// });
// */
//
// VoteSchema.index({author: 1, document: 1}, {unique: true});
//
// export const Vote = mongoose.model<IVote>("Vote", VoteSchema) as IVoteModel;
//
// /*
// export = function (schema: mongoose.Schema, options: {
//   userModel: string,
//   voteCollection: string,
//   reputation: boolean,
// } = {
//   userModel: "User", voteCollection: "Vote", reputation: true}): void {
//   schema.add({
//     voting: {
//       sum: {
//         type: mongoose.Schema.Types.Number,
//         default: 0,
//       },
// //      votes: [{type: mongoose.Schema.Types.ObjectId, ref: Vote.modelName}]
//     }
//   });
//
//   schema.methods.vote = function (user: any, impact: Number = 1, fn: Function = undefined) {
//     if (user.id) {
//       return schema.methods.vote.call(this, user.id, impact, fn);
//     }
//
//     return Vote.create({impact, author: user, ref: { model: this.constructor.modelName, item: this.id } });
//   };
//
//   schema.methods.upvote = function (user: any, fn: Function = undefined) {
//     if (user._id) {
//       return schema.methods.upvote.call(this, user._id, fn);
//     }
//     return this.vote(user, +1, fn);
//   };
//
//   schema.methods.downvote = function (user: any, fn: Function = undefined) {
//     if (user._id) {
//       return schema.methods.downvote.call(this, user._id, fn);
//     }
//     return this.vote(user, -1, fn);
//   };
//
//   schema.methods.voted = function (user: any) {
//     if (user._id) {
//       return schema.methods.upvoted.call(this, user._id);
//     }
//
//     return this.voting.votes.find((vote: any) => vote.author._id === user);
//   };
// };
// */
