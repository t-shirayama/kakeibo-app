import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";

describe("formatCurrency", () => {
  it("JPYを小数なしで表示する", () => {
    expect(formatCurrency(2480)).toMatch(/2,480/);
    expect(formatCurrency(0)).toMatch(/0/);
  });
});
