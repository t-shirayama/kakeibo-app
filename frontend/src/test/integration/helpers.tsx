import userEvent from "@testing-library/user-event";
import type { RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { setMockUrl } from "@/test/navigation";
import { renderWithClient } from "@/test/render";

export function renderWithRoute(ui: ReactElement, path: string, options?: RenderOptions) {
  setMockUrl(path);
  return renderWithClient(ui, options);
}

export function setupIntegrationUser() {
  return userEvent.setup();
}
