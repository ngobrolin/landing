import { describe, it, expect } from "vitest";
import { formatDuration, formatFileSize, parseDurationString } from "./utils";

describe("formatDuration", () => {
  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("0m 45s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("2m 5s");
  });

  it("formats hours, minutes and seconds", () => {
    expect(formatDuration(3665)).toBe("1h 1m 5s");
  });

  it("formats exactly one hour", () => {
    expect(formatDuration(3600)).toBe("1h 0m 0s");
  });

  it("handles zero", () => {
    expect(formatDuration(0)).toBe("0m 0s");
  });
});

describe("formatFileSize", () => {
  it("formats bytes to MB", () => {
    expect(formatFileSize(1048576)).toBe("1.0 MB");
  });

  it("formats large files", () => {
    expect(formatFileSize(110434472)).toBe("105.3 MB");
  });

  it("handles small files", () => {
    expect(formatFileSize(524288)).toBe("0.5 MB");
  });

  it("handles zero", () => {
    expect(formatFileSize(0)).toBe("0.0 MB");
  });
});

describe("parseDurationString", () => {
  it("parses HH:MM:SS format", () => {
    expect(parseDurationString("01:55:02")).toBe(6902);
  });

  it("parses with milliseconds", () => {
    expect(parseDurationString("01:55:02.09")).toBe(6902);
  });

  it("parses short duration", () => {
    expect(parseDurationString("00:02:30")).toBe(150);
  });

  it("handles invalid format", () => {
    expect(parseDurationString("invalid")).toBe(0);
  });

  it("handles empty string", () => {
    expect(parseDurationString("")).toBe(0);
  });
});
