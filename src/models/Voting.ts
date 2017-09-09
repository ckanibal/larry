import * as mongoose from "mongoose";

const VoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  impact: Number,
}, { timestamps: true });
const Vote = mongoose.model("Vote", VoteSchema);

export = function(schema: mongoose.Schema, options: {
  userModel: string,
  voteCollection: string,
  reputation: boolean,
} = { userModel: "User", voteCollection: "Vote", reputation: true }): void {
  schema.add({
    voting: {
      sum: Number,
      votes: [{ type: mongoose.Schema.Types.ObjectId, ref: Vote.modelName }]
    }
  });

  schema.methods.vote = function(user: any, impact: Number = 1, fn: Function = undefined) {
    if (user._id) {
      return schema.methods.vote.call(this, user._id, impact, fn);
    }

    this.findOneAndUpdate(
      { _id: this._id },
      {
        $pull: { voting: { votes: { author: { _id: user } } } },
        $push: { voting: { votes: new Vote({ impact, author: { _id: user } } ) } },
        $inc: { votes: { sum: impact } },
      },
      { safe: true },
      function (err: Error, raw: string) {
        if (err) {
          throw err;
        } else {
          if (options.reputation) {
            this.model(options.userModel).findOneAndUpdate(
              { _id: this.author._id },
              {
                $inc: { voting: {sum: impact} },
              },
              {safe: true},
              fn
            );
          }
        }
      }
    );
  };

  schema.methods.upvote = function(user: any, fn: Function = undefined) {
    if (user._id) {
      return schema.methods.upvote.call(this, user._id, fn);
    }
    return this.vote(user, +1, fn);
  };

  schema.methods.downvote = function(user: any, fn: Function = undefined) {
    if (user._id) {
      return schema.methods.downvote.call(this, user._id, fn);
    }
    return this.vote(user, -1, fn);
  };

  schema.methods.voted = function(user: any) {
    if (user._id) {
      return schema.methods.upvoted.call(this, user._id);
    }

    return this.voting.votes.find((vote: any) => vote.author._id === user);
  };
};
