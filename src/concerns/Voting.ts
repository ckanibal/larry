// concerns/Voting.ts

import { Schema, Model, model, Document, Types, PaginateModel } from "mongoose";
import httpStatus = require("http-status");

/**
 * Voting Model
 */

export interface IVote extends Document {
  impact: number;
  author: {};
  ref: {
    model: string,
    document: Document,
    required: true,
  };
}


export interface IVoteModel extends PaginateModel<IVote> {
  register(modelName: any): void;
}


const VoteSchema = new Schema({
  author: {
    type: Schema.Types.Mixed,
    required: true,
  },
  ref: {
    model: Schema.Types.String,
    document: {type: Schema.Types.ObjectId, refPath: "ref.model", required: true},
  },
  impact: {
    type: Schema.Types.Number,
    required: true,
  }
}, {timestamps: true});
VoteSchema.index({author: 1, "ref.document": 1}, {unique: true});


VoteSchema.methods.updateReferenced = function (next: Function, done: Function) {
  /*
  This method is quite tricky; it updates the voting sum on the document specified by the ref-attribute
  However, since the referenced document might also be a subdocument of another document, it is not sufficient to just
  use the $lookup-Operator on the dynamic ref; we need to figure out the parent document ourselves, using the model path:
  f.e.: ref.model == "Upload.tags" => Collection Upload, Query tags by ref.document (ObjectId)

  the positional $-Operator is a excellent tool for this use-casey

  == Update ==
  - Remove ability to vote on subdocuments
 */

  this.populate("ref.document", function (err: Error, vote: IVote) {
    if (!err) {
      next();

      // update referenced Document
      vote.ref.document.update({
        $inc: {
          "voting.sum": vote.impact,
        }
      }, {}, function (err, raw) {
        if (!err) {
          done();
        } else {
          // Todo: https://github.com/DefinitelyTyped/DefinitelyTyped/pull/19954
          (<any>done)(err);
        }
      });
    } else {
      next(err);
    }
  });
};

VoteSchema.pre("save", true, function (next, done) {
  this.updateReferenced(next, done);
});

VoteSchema.pre("remove", true, function (next, done) {
  // undo vote impact
  this.impact = -this.impact;
  this.updateReferenced(next, done);
});

export const Vote = model<IVote>("Vote", VoteSchema) as IVoteModel;


export interface Votable {
  voting: {
    sum: number
  };

  vote(impact: Number, user: Document, cb?: Function): Function;
}

export function votingPlugin<T extends Document>
(schema: Schema, options: { user?: Model<T>, validate?: { validator: Function, message?: string } } = {validate: {validator: () => true}}) {
  schema.add({
    voting: {
      sum: {
        type: Schema.Types.Number,
        default: 0,
      }
    }
  });

  schema.methods.vote = function (impact: number = 1, user: T, cb?: Function) {
    if (options.validate.validator(impact)) {
      Vote.find({author: user.id, "ref.document": this.id}, (err: Error, votes: IVote[]) => {
        if (err) {
          return cb(err);
        } else {
          // Remove previous votes
          Promise.all(votes.map(vote => vote.remove()))
            .then(() => {
              Vote.create({
                impact,
                author: user,
                ref: {
                  document: this.id,
                  model: this.constructor.modelName // Todo: This is probably not api-safe
                },
              }, cb);
            })
            .catch(reason => cb(reason));
        }
      });
    } else {
      const err = new Error(options.validate.message);
      err.status = httpStatus.BAD_REQUEST;
      return cb(err);
    }
  };
}
