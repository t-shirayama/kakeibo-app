import { createGeneratedApiClient, type GeneratedApiTransport } from "../generated/openapi-client";
import { api_blob, api_fetch, api_mutation } from "./core";

const transport: GeneratedApiTransport = {
  requestJson: (config) => {
    const init: RequestInit = {
      method: config.method,
      headers: config.headers,
      body: config.body,
    };
    if (config.method === "GET") {
      return api_fetch(config.path, init);
    }
    return api_mutation(config.path, init);
  },
  requestBlob: (config) =>
    api_blob(config.path, {
      method: config.method,
      headers: config.headers,
      body: config.body,
    }),
};

export const generatedApi = createGeneratedApiClient(transport);
