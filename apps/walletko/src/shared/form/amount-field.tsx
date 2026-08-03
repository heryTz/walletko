import { type ComponentProps, useState } from "react";
import { useFieldContext } from "src/shared/form/form-setup";
import {
  formatAmountDraft,
  parseAmountDraft,
  syncAmountDraft,
} from "src/shared/lib/amount-draft";
import { useFormatError } from "src/shared/lib/use-format-error";
import { FormField } from "src/shared/ui/form-field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "src/shared/ui/input-group";

type AmountFieldProps = {
  label: string;
  currency?: string;
} & Omit<ComponentProps<"input">, "type" | "value" | "onChange" | "onBlur">;

export function AmountField({
  label,
  currency = "$",
  ...inputProps
}: AmountFieldProps) {
  const field = useFieldContext<number>();
  const formatError = useFormatError();
  const error = field.state.meta.isValid
    ? undefined
    : formatError(field.state.meta.errors);

  const [draft, setDraft] = useState(() =>
    formatAmountDraft(field.state.value),
  );
  const value = syncAmountDraft(draft, field.state.value);
  if (value !== draft) setDraft(value);

  const handleChange = (next: string) => {
    setDraft(next);
    field.handleChange(parseAmountDraft(next));
  };

  return (
    <FormField label={label} error={error}>
      <InputGroup>
        <InputGroupAddon>{currency}</InputGroupAddon>
        <InputGroupInput
          {...inputProps}
          id={field.name}
          type="number"
          min="0.01"
          step="0.01"
          placeholder="0.00"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={field.handleBlur}
          aria-invalid={!!error || undefined}
        />
      </InputGroup>
    </FormField>
  );
}
