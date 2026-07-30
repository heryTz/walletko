import type { ComponentProps } from "react";
import { useFieldContext } from "src/shared/form/form-setup";
import { useFormatError } from "src/shared/lib/use-format-error";
import { AutocompleteInput } from "src/shared/ui/autocomplete-input";
import { FormField } from "src/shared/ui/form-field";

type AutocompleteFieldProps = Omit<
  ComponentProps<typeof AutocompleteInput>,
  "value" | "onValueChange"
> & {
  label: string;
  onSearchChange: (search: string) => void;
};

export function AutocompleteField({
  label,
  onSearchChange,
  ...autocompleteProps
}: AutocompleteFieldProps) {
  const field = useFieldContext<string>();
  const formatError = useFormatError();
  const error = field.state.meta.isValid
    ? undefined
    : formatError(field.state.meta.errors);

  return (
    <FormField label={label} error={error}>
      <AutocompleteInput
        {...autocompleteProps}
        id={field.name}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => {
          field.handleChange(value);
          onSearchChange(value);
        }}
        onBlur={field.handleBlur}
        aria-invalid={!!error}
      />
    </FormField>
  );
}
