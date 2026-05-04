import type { ApiClient } from "../types";
import { generatedApi } from "../generated";

export function createAuthApi(): Pick<ApiClient, "login"> {
  return {
    async login(request) {
      return generatedApi.login(request);
    },
  };
}
