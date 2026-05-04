import type { ApiClient } from "../types";
import { generatedApi } from "../generated";

export function createCategoryApi(): Pick<ApiClient, "list_categories" | "create_category" | "update_category" | "set_category_active" | "delete_category"> {
  return {
    async list_categories(params = {}) {
      return generatedApi.list_categories(params);
    },
    async create_category(request) {
      return generatedApi.create_category(request);
    },
    async update_category(categoryId, request) {
      return generatedApi.update_category({ category_id: categoryId }, request);
    },
    async set_category_active(categoryId, isActive) {
      return generatedApi.set_category_active({ category_id: categoryId }, { is_active: isActive });
    },
    async delete_category(categoryId) {
      return generatedApi.delete_category({ category_id: categoryId }) as Promise<{ status: string }>;
    },
  };
}
