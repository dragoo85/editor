import { describe, expect, it } from "vitest";
import { asRecord, requireDriveId, requireString, ValidationError } from "../src/lib/validation";
import { isPdf, isTextLike } from "../src/lib/google/drive";

describe("validation", () => {
  it("requires non-empty strings within length bounds", () => {
    expect(requireString({ name: "report.pdf" }, "name")).toBe("report.pdf");
    expect(() => requireString({}, "name")).toThrow(ValidationError);
    expect(() => requireString({ name: "" }, "name")).toThrow(ValidationError);
    expect(() => requireString({ name: "x".repeat(9999) }, "name", { max: 10 })).toThrow(ValidationError);
  });

  it("rejects drive ids with unsafe characters", () => {
    expect(requireDriveId({ fileId: "1AbC_123-xyz" }, "fileId")).toBe("1AbC_123-xyz");
    expect(() => requireDriveId({ fileId: "bad id" }, "fileId")).toThrow(ValidationError);
    expect(() => requireDriveId({ fileId: "../../etc/passwd" }, "fileId")).toThrow(ValidationError);
  });

  it("rejects non-object bodies", () => {
    expect(() => asRecord([])).toThrow(ValidationError);
    expect(() => asRecord(null)).toThrow(ValidationError);
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
  });
});

describe("drive helpers", () => {
  it("classifies text-like mime types", () => {
    expect(isTextLike("text/plain")).toBe(true);
    expect(isTextLike("application/json")).toBe(true);
    expect(isTextLike("image/png")).toBe(false);
  });

  it("classifies PDFs", () => {
    expect(isPdf("application/pdf")).toBe(true);
    expect(isPdf("text/plain")).toBe(false);
  });
});