import { expect, type Page } from "@playwright/test";

const RAKUTEN_STATEMENT_PDF_BASE64 =
  "JVBERi0xLjcKJcK1wrYKJSBXcml0dGVuIGJ5IE11UERGIDEuMjcuMgoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFIvSW5mbzw8L1Byb2R1Y2VyKE11UERGIDEuMjcuMik+Pj4+CmVuZG9iagoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0NvdW50IDEvS2lkc1s0IDAgUl0+PgplbmRvYmoKCjMgMCBvYmoKPDwvRm9udDw8L2phcGFuIDUgMCBSPj4+PgplbmRvYmoKCjQgMCBvYmoKPDwvVHlwZS9QYWdlL01lZGlhQm94WzAgMCA1OTUgODQyXS9Sb3RhdGUgMC9SZXNvdXJjZXMgMyAwIFIvUGFyZW50IDIgMCBSL0NvbnRlbnRzWzggMCBSIDkgMCBSIDEwIDAgUiAxMSAwIFIgMTIgMCBSXT4+CmVuZG9iagoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMC9CYXNlRm9udC9Hb3RoaWMvRW5jb2RpbmcvVW5pSklTLVVURjE2LUgvRGVzY2VuZGFudEZvbnRzWzYgMCBSXT4+CmVuZG9iagoKNiAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9DSURGb250VHlwZTAvQmFzZUZvbnQvR290aGljL0NJRFN5c3RlbUluZm88PC9SZWdpc3RyeShBZG9iZSkvT3JkZXJpbmcoSmFwYW4xKS9TdXBwbGVtZW50IDY+Pi9Gb250RGVzY3JpcHRvciA3IDAgUj4+CmVuZG9iagoKNyAwIG9iago8PC9UeXBlL0ZvbnREZXNjcmlwdG9yL0ZvbnROYW1lKEdvdGhpYykvRm9udEJCb3hbLTIwMCAtMjAwIDEyMDAgMTIwMF0vRmxhZ3MgNC9JdGFsaWNBbmdsZSAwL0FzY2VudCAxMDAwL0Rlc2NlbnQgLTIwMC9TdGVtViA4MD4+CmVuZG9iagoKOCAwIG9iago8PC9MZW5ndGggNzUvRmlsdGVyL0ZsYXRlRGVjb2RlPj4Kc3RyZWFtCnja4yrkcgrhMlQwAEJDBXMjBXNzA4WQXC79rMSCxDwFQyOFkDSFaBsDA2MjIDaA0mYGBkZpUL4JlA0Wt4sN8eJyDeEK5AIAV7YTJgplbmRzdHJlYW0KZW5kb2JqCgo5IDAgb2JqCjw8L0xlbmd0aCA3OC9GaWx0ZXIvRmxhdGVEZWNvZGU+PgpzdHJlYW0KeNrjKuRyCuEyVDAAQkMFcyMFc1MjhZBcLv2sxILEPAVDICdNIdrGwMDE1MDA2AhEGxskmxkbJFkCaQsEnWhkFxvixeUawhXIBQAjABNJCmVuZHN0cmVhbQplbmRvYmoKCjEwIDAgb2JqCjw8L0xlbmd0aCA2My9GaWx0ZXIvRmxhdGVEZWNvZGU+PgpzdHJlYW0KeJzjKuRyCuEyVDAAQkMFcyMFc2MThZBcLv2sxILEPAVDI4WQNIVoGzNzo2ST1KREu9gQLy7XEK5ALgBq+g1mCmVuZHN0cmVhbQplbmRvYmoKCjExIDAgb2JqCjw8L0xlbmd0aCA3MS9GaWx0ZXIvRmxhdGVEZWNvZGU+PgpzdHJlYW0KeJzjKuRyCuEyVDAAQkMFcyMFc0MzhZBcLv2sxILEPAVDI4WQNIVoGwMDY0NTs5RUMyNTU2MDExO72BAvLtcQrkAuANKNDp0KZW5kc3RyZWFtCmVuZG9iagoKMTIgMCBvYmoKPDwvTGVuZ3RoIDc0L0ZpbHRlci9GbGF0ZURlY29kZT4+CnN0cmVhbQp4nOMq5HIK4TJUMABCQwVzIwUzSwuFkFwu/azEgsQ8BUMjhZA0hWgbAwNjQwMDo2QgbQphG1uYGlqY2cWGeHG5hnAFcgEARkYP9QplbmRzdHJlYW0KZW5kb2JqCgp4cmVmCjAgMTMKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDQyIDAwMDAwIG4gCjAwMDAwMDAxMjAgMDAwMDAgbiAKMDAwMDAwMDE3MiAwMDAwMCBuIAowMDAwMDAwMjE0IDAwMDAwIG4gCjAwMDAwMDAzNDggMDAwMDAgbiAKMDAwMDAwMDQ1NiAwMDAwMCBuIAowMDAwMDAwNjA5IDAwMDAwIG4gCjAwMDAwMDA3NTMgMDAwMDAgbiAKMDAwMDAwMDg5NiAwMDAwMCBuIAowMDAwMDAxMDQyIDAwMDAwIG4gCjAwMDAwMDExNzQgMDAwMDAgbiAKMDAwMDAwMTMxNCAwMDAwMCBuIAoKdHJhaWxlcgo8PC9TaXplIDEzL1Jvb3QgMSAwIFIvSURbPEMzQjc0QzcwQzM4ODcyQzJCNkMyQTdDMzlFQzNCNDJGPjw2REVDOEUyQzUzNURDNzhERDREOTUwNUMxNEJENTg5RT5dPj4Kc3RhcnR4cmVmCjE0NTcKJSVFT0YK";

export async function createPdfDataTransfer(page: Page, fileName: string) {
  return page.evaluateHandle(({ name, base64 }) => {
    const dataTransfer = new DataTransfer();
    const binary = atob(base64);
    const content = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    dataTransfer.items.add(new File([content], name, { type: "application/pdf" }));
    return dataTransfer;
  }, { name: fileName, base64: RAKUTEN_STATEMENT_PDF_BASE64 });
}

export async function dropPdfOnUploadZone(page: Page, fileName: string) {
  await page.getByLabel("PDFファイルのドロップゾーン").dispatchEvent("drop", {
    dataTransfer: await createPdfDataTransfer(page, fileName),
  });
}

export async function uploadPdfAndWaitForHistory(page: Page, fileName: string) {
  const uploadResponse = page.waitForResponse((response) =>
    response.url().includes("/api/uploads") && response.request().method() === "POST",
  );

  await dropPdfOnUploadZone(page, fileName);
  await expect(page.getByLabel("アップロード進捗")).toBeVisible();
  await expect(page.getByText(fileName)).toBeVisible();
  await uploadResponse;
  return expectUploadHistoryRow(page, fileName, { status: "完了" });
}

export async function expectUploadHistoryRow(
  page: Page,
  fileName: string,
  options: { status: string; importedCount?: string; errorMessage?: string },
) {
  const row = page.getByRole("row").filter({ hasText: fileName });
  await expect(row).toContainText(options.status);
  if (options.importedCount) {
    await expect(row).toContainText(options.importedCount);
  }
  if (options.errorMessage) {
    await expect(row).toContainText(options.errorMessage);
  }
  return row;
}
