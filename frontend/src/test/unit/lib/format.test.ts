import { describe, expect, it } from "vitest";
import { formatCurrency } from "@/lib/format";

describe("formatCurrency", () => {
  it("JPYを小数なしで表示する", () => {
    expect(formatCurrency(2480)).toMatch(/2,480/);
    expect(formatCurrency(0)).toMatch(/0/);
  });

  it("負の金額も通貨形式で表示する", () => {
    expect(formatCurrency(-1200)).toMatch(/1,200/);
    expect(formatCurrency(-1200)).toContain("-");
  });
});
