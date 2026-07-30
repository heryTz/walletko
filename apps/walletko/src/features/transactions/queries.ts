import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import type {
  SuggestibleTransactionType,
  TransactionDTO,
} from "src/server/contracts/transaction";
import {
  getExpenseCancelPreviewFn,
  getExpenseFn,
} from "src/server/functions/expense.fn";
import {
  getIncomeCancelPreviewFn,
  getIncomeFn,
} from "src/server/functions/income.fn";
import {
  listTransactionsFn,
  searchNameSuggestionsFn,
} from "src/server/functions/transactions.fn";

type TransactionTypeValue = TransactionDTO["type"];

type TransactionFilters = {
  types: string[];
  name: string;
  tagIds: string[];
  page: number;
};

export const transactionKeys = {
  all: ["transactions"] as const,
  list: (filters: TransactionFilters) =>
    [...transactionKeys.all, "list", filters] as const,
  income: (id: string) => [...transactionKeys.all, "income", id] as const,
  expense: (id: string) => [...transactionKeys.all, "expense", id] as const,
  expenseCancelPreview: (id: string) =>
    [...transactionKeys.all, "expense-cancel-preview", id] as const,
  incomeCancelPreview: (id: string) =>
    [...transactionKeys.all, "income-cancel-preview", id] as const,
  nameSuggestions: (type: SuggestibleTransactionType, search: string) =>
    [...transactionKeys.all, "name-suggestions", type, search] as const,
};

export const transactionsQuery = (filters: TransactionFilters) =>
  queryOptions({
    queryKey: transactionKeys.list(filters),
    queryFn: () =>
      listTransactionsFn({
        data: {
          ...filters,
          types: filters.types as TransactionTypeValue[],
        },
      }),
  });

export const incomeQuery = (id: string) =>
  queryOptions({
    queryKey: transactionKeys.income(id),
    queryFn: () => getIncomeFn({ data: { id } }),
  });

export const expenseQuery = (id: string) =>
  queryOptions({
    queryKey: transactionKeys.expense(id),
    queryFn: () => getExpenseFn({ data: { id } }),
  });

export const expenseCancelPreviewQuery = (id: string) =>
  queryOptions({
    queryKey: transactionKeys.expenseCancelPreview(id),
    queryFn: () => getExpenseCancelPreviewFn({ data: { id } }),
  });

export const incomeCancelPreviewQuery = (id: string) =>
  queryOptions({
    queryKey: transactionKeys.incomeCancelPreview(id),
    queryFn: () => getIncomeCancelPreviewFn({ data: { id } }),
  });

export const nameSuggestionsQuery = (
  type: SuggestibleTransactionType,
  search: string,
) =>
  queryOptions({
    queryKey: transactionKeys.nameSuggestions(type, search),
    queryFn: () => searchNameSuggestionsFn({ data: { type, search } }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    retry: false,
  });
