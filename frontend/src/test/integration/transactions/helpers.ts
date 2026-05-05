import { fireEvent, screen, within } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

export async function openTransactionCreateDialog(user: UserEvent) {
  await user.click(screen.getByRole("button", { name: "手動で追加" }));
  return within(await screen.findByRole("dialog"));
}

export async function fillTransactionForm(
  dialog: ReturnType<typeof within>,
  user: UserEvent,
  values: {
    date: string;
    shopName: string;
    categoryId: string;
    amount: string;
    paymentMethod?: string;
    memo?: string;
  },
) {
  fireEvent.change(dialog.getByLabelText("日付"), { target: { value: values.date } });
  await user.type(dialog.getByLabelText("店名"), values.shopName);
  await user.selectOptions(dialog.getByLabelText("カテゴリ"), values.categoryId);
  await user.clear(dialog.getByLabelText("金額"));
  await user.type(dialog.getByLabelText("金額"), values.amount);
  if (values.paymentMethod) {
    await user.type(dialog.getByLabelText("支払い方法"), values.paymentMethod);
  }
  if (values.memo) {
    await user.type(dialog.getByLabelText("メモ"), values.memo);
  }
}
