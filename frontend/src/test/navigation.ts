import { vi } from "vitest";

export type MockRouter = {
  push: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
};

type NavigationState = {
  url: URL;
  router: MockRouter;
};

const navigationState = vi.hoisted<NavigationState>(() => {
  const state = {
    url: new URL("http://localhost/dashboard"),
    router: {
      push: vi.fn((href: string) => {
        state.url = new URL(href, state.url);
      }),
      replace: vi.fn((href: string) => {
        state.url = new URL(href, state.url);
      }),
      refresh: vi.fn(),
      prefetch: vi.fn(),
    },
  };

  return state;
});

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.url.pathname,
  useRouter: () => navigationState.router,
  useSearchParams: () => new URLSearchParams(navigationState.url.search),
}));

export function setMockUrl(path: string) {
  navigationState.url = new URL(path, "http://localhost");
  if (typeof window !== "undefined") {
    window.history.pushState(
      {},
      "",
      `${navigationState.url.pathname}${navigationState.url.search}${navigationState.url.hash}`,
    );
  }
}

export function getMockRouter() {
  return navigationState.router;
}

export function resetMockNavigation(path = "/dashboard") {
  setMockUrl(path);
  navigationState.router.push.mockClear();
  navigationState.router.replace.mockClear();
  navigationState.router.refresh.mockClear();
  navigationState.router.prefetch.mockClear();
}
