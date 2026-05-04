import type { Page } from "@playwright/test";

export async function createPdfDataTransfer(page: Page, fileName: string) {
  return page.evaluateHandle((name) => {
    const dataTransfer = new DataTransfer();
    const content = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    dataTransfer.items.add(new File([content], name, { type: "application/pdf" }));
    return dataTransfer;
  }, fileName);
}
