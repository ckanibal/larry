import { expect } from "chai";
import { Upload } from "./Upload";
import * as mongoose from "mongoose";
import * as faker from "faker";

describe('Database Tests', function () {
  //Before starting the test, create a sandboxed database connection
  //Once a connection is established invoke done()
  before(function (done) {
    mongoose.connect("mongodb://localhost/testDatabase");
    const db = mongoose.connection;
    db.on("error", console.error.bind(console, "connection error"));
    db.once("open", function () {
      console.log("We are connected to test database!");
      done();
    });
  });
  describe("Test Database", function () {
    //Save object with 'name' value of 'Mike"
    it("New upload saved to test database", function (done) {
      const testUpload = new Upload({
        title: "MinorMelee",
        description: "Das einfache und traditionelle Kampfszenario in Clonk für 2 bis 12 Spieler. \
          \
          Ein Clonk pro Spieler - alles andere ist frei: laufen, springen, Steine werfen. Der Gegner sollte durch Stein- oder Feuersteintreffer geschwächt werden, bevor man ihn zum direkten Faustkampf herausfordert. \
          \
          Nach und nach erscheinen mächtigere Waffen im Erdreich, die durch Ausgraben in den Besitz gebracht werden können. \
          \
          Das Ziel ist die Eliminierung aller anderen Spieler.",
      });

      testUpload.save(done);
    });
    it("Should retrieve data from test database", function (done) {
      //Look up the 'Mike' object previously saved.
      Upload.find({title: "MinorMelee"}, (err, upload) => {
        if (err) {
          throw err;
        }
        if (upload.length === 0) {
          throw new Error("No data!");
        }
        done();
      });
    });
  });
  //After all tests are finished drop database and close connection
  after(function (done) {
    mongoose.connection.db.dropDatabase(function () {
      mongoose.connection.close(done);
    });
  });
});

describe("Upload", function () {
  it("should be invalid if title is empty", function (done) {
    const u = new Upload();

    u.validate(function (err) {
      expect(err.errors.title).to.exist;
      done();
    });
  });

  it("should be invalid if description is empty", function (done) {
    const u = new Upload();

    u.validate(function (err) {
      expect(err.errors.description).to.exist;
      done();
    });
  });

  it("should be invalid if description is empty", function (done) {
    const u = new Upload();

    u.validate(function (err) {
      expect(err.errors.description).to.exist;
      done();
    });
  });
});
