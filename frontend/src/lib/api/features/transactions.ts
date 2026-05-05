import type { ApiClient, TransactionDto } from "../types";
import { downloadBlob } from "../download";
import { generatedApi } from "../generated";

export function createTransactionApi(): Pick<
  ApiClient,
  | "list_transactions"
  | "list_all_transactions"
  | "create_transaction"
  | "update_transaction"
  | "count_same_shop_transactions"
  | "update_same_shop_category"
  | "delete_transaction"
  | "export_transactions"
  | "get_recent_transactions"
> {
  return {
    async list_transactions(params = {}) {
      return generatedApi.list_transactions(params);
    },
    async list_all_transactions(params = {}) {
      const items: TransactionDto[] = [];
      let page = 1;
      let total = 0;
      const pageSize = 100;

      do {
        const response = await generatedApi.list_transactions({
          ...params,
          page,
          page_size: pageSize,
        });
        items.push(...response.items);
        total = response.total;
        page += 1;
      } while (items.length < total);

      return items;
    },
    async create_transaction(request) {
      return generatedApi.create_transaction(request);
    },
    async update_transaction(transactionId, request) {
      return generatedApi.update_transaction({ transaction_id: transactionId }, request);
    },
    async count_same_shop_transactions(transactionId) {
      return generatedApi.count_same_shop_transactions({ transaction_id: transactionId });
    },
    async update_same_shop_category(transactionId, shopName, categoryId) {
      return generatedApi.update_same_shop_category(
        { transaction_id: transactionId },
        { shop_name: shopName, category_id: categoryId },
      );
    },
    async delete_transaction(transactionId) {
      return generatedApi.delete_transaction({ transaction_id: transactionId }) as Promise<{ status: string }>;
    },
    async export_transactions(params = {}) {
      const blob = await generatedApi.export_transactions(params);
      downloadBlob(blob, "kakeibo-export.xlsx");
    },
    async get_recent_transactions(params = {}) {
      const rows = await generatedApi.get_recent_transactions(params);
      return rows.map((row) => ({
        ...row,
        display_category_id: row.category_id,
        category_color: undefined,
        transaction_type: row.transaction_type as TransactionDto["transaction_type"],
        card_user_name: null,
        source_upload_id: null,
        source_file_name: null,
        source_row_number: null,
        source_page_number: null,
        source_format: null,
        source_hash: null,
      }));
    },
  };
}
