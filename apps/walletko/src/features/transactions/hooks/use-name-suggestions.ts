import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { nameSuggestionsQuery } from "src/features/transactions/queries";
import type { SuggestibleTransactionType } from "src/server/contracts/transaction";
import { useDebouncedValue } from "src/shared/hooks/use-debounced-value";

type UseNameSuggestionsOptions = {
  enabled?: boolean;
};

export function useNameSuggestions(
  type: SuggestibleTransactionType,
  { enabled = true }: UseNameSuggestionsOptions = {},
) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data = [], isFetching } = useQuery({
    ...nameSuggestionsQuery(type, debouncedSearch),
    enabled,
  });

  const options = data.map((suggestion) => ({
    value: suggestion.name,
    hint: suggestion.tags.map((tag) => tag.name).join(", "),
  }));

  const tagsFor = (name: string) =>
    data
      .find((suggestion) => suggestion.name === name)
      ?.tags.map((tag) => ({ value: tag.id, label: tag.name })) ?? [];

  return {
    options,
    isFetching: isFetching || search !== debouncedSearch,
    setSearch,
    tagsFor,
  };
}
