import { expect } from "chai";
import { Upload } from "./Upload";

describe("Upload", function() {
  it("should be invalid if title is empty", function(done) {
    const u = new Upload();

    u.validate(function(err) {
      expect(err.errors.title).to.exist;
      done();
    });
  });

  it("should be invalid if description is empty", function(done) {
    const u = new Upload();

    u.validate(function(err) {
      expect(err.errors.description).to.exist;
      done();
    });
  });
});
