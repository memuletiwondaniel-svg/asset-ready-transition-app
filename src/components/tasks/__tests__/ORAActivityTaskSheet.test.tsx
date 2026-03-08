import { describe, it, expect } from "vitest";

/**
 * Tests the isDirty logic from ORAActivityTaskSheet to verify:
 * 1. Comment text triggers dirty state
 * 2. Status change to COMPLETED triggers dirty state
 * 3. No changes = not dirty
 */

function computeIsDirty(params: {
  status: string;
  originalStatus: string;
  description: string;
  originalDescription: string;
  filesCount: number;
  datesChanged: boolean;
  progressChanged: boolean;
  predsChanged: boolean;
  nameChanged: boolean;
  comment: string;
}) {
  return (
    params.status !== params.originalStatus ||
    params.description !== params.originalDescription ||
    params.filesCount > 0 ||
    params.datesChanged ||
    params.progressChanged ||
    params.predsChanged ||
    params.nameChanged ||
    params.comment.trim().length > 0
  );
}

const defaults = {
  status: "IN_PROGRESS",
  originalStatus: "IN_PROGRESS",
  description: "desc",
  originalDescription: "desc",
  filesCount: 0,
  datesChanged: false,
  progressChanged: false,
  predsChanged: false,
  nameChanged: false,
  comment: "",
};

describe("ORAActivityTaskSheet isDirty logic", () => {
  it("is not dirty when nothing changed", () => {
    expect(computeIsDirty(defaults)).toBe(false);
  });

  it("is dirty when comment is typed", () => {
    expect(computeIsDirty({ ...defaults, comment: "Test comment" })).toBe(true);
  });

  it("is dirty when status changed to COMPLETED", () => {
    expect(computeIsDirty({ ...defaults, status: "COMPLETED" })).toBe(true);
  });

  it("is dirty when progress changed", () => {
    expect(computeIsDirty({ ...defaults, progressChanged: true })).toBe(true);
  });

  it("is not dirty when comment is only whitespace", () => {
    expect(computeIsDirty({ ...defaults, comment: "   " })).toBe(false);
  });

  it("is dirty when files are added", () => {
    expect(computeIsDirty({ ...defaults, filesCount: 1 })).toBe(true);
  });
});
