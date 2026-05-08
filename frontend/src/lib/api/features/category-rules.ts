import type { ApiClient } from "../types";
import { generatedApi } from "../generated";

export function createCategoryRuleApi(): Pick<
  ApiClient,
  "list_category_rules" | "create_category_rule" | "update_category_rule" | "set_category_rule_active" | "delete_category_rule"
> {
  return {
    async list_category_rules(params = {}) {
      return generatedApi.list_category_rules(params);
    },
    async create_category_rule(request) {
      return generatedApi.create_category_rule(request);
    },
    async update_category_rule(ruleId, request) {
      return generatedApi.update_category_rule({ rule_id: ruleId }, request);
    },
    async set_category_rule_active(ruleId, isActive) {
      return generatedApi.set_category_rule_active({ rule_id: ruleId }, { is_active: isActive });
    },
    async delete_category_rule(ruleId) {
      return generatedApi.delete_category_rule({ rule_id: ruleId }) as Promise<{ status: string }>;
    },
  };
}
