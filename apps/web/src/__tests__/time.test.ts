import { timeAgo } from "@/lib/utils/time";

describe("timeAgo", () => {
  it("formats seconds", () => {
    const now = new Date("2025-01-01T00:00:10.000Z").getTime();
    expect(timeAgo("2025-01-01T00:00:05.000Z", now)).toBe("5s ago");
  });

  it("formats hours", () => {
    const now = new Date("2025-01-01T10:00:00.000Z").getTime();
    expect(timeAgo("2025-01-01T08:00:00.000Z", now)).toBe("2h ago");
  });
});

