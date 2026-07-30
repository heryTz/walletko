import type { ComponentProps, KeyboardEvent } from "react";
import { useId, useState } from "react";
import { cn } from "src/shared/lib/utils";
import { HighlightMatch } from "src/shared/ui/highlight-match";
import { Input } from "src/shared/ui/input";
import { Spinner } from "src/shared/ui/spinner";

export type AutocompleteOption = { value: string; hint?: string };

type AutocompleteInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "onSelect"
> & {
  value: string;
  onValueChange: (value: string) => void;
  options: AutocompleteOption[];
  isFetching?: boolean;
  onSelect?: (value: string) => void;
  recentLabel?: string;
};

export function AutocompleteInput({
  value,
  onValueChange,
  options,
  isFetching = false,
  onSelect,
  recentLabel = "Recent",
  className,
  onFocus,
  onBlur,
  onKeyDown,
  ...inputProps
}: AutocompleteInputProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const showPanel = open && (options.length > 0 || isFetching);
  const showRecentLabel = value.trim().length === 0 && options.length > 0;
  const safeActiveIndex = activeIndex < options.length ? activeIndex : -1;

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const selectOption = (option: AutocompleteOption) => {
    onValueChange(option.value);
    onSelect?.(option.value);
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);

    if (event.key === "Escape") {
      if (showPanel) {
        // Base UI's dialog dismissal listens for Escape natively on
        // `document`, bypassing React's synthetic event system, so
        // `stopPropagation()` alone would not stop it from also closing
        // the dialog.
        event.stopPropagation();
        event.nativeEvent.stopPropagation();
      }
      close();
      return;
    }
    if (event.key === "Tab") {
      close();
      return;
    }

    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setOpen(true);
      return;
    }

    if (!showPanel || options.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => {
        const safe = index < options.length ? index : -1;
        return (safe + 1) % options.length;
      });
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => {
        const safe = index < options.length ? index : -1;
        return safe <= 0 ? options.length - 1 : safe - 1;
      });
    } else if (event.key === "Enter" && safeActiveIndex >= 0) {
      event.preventDefault();
      selectOption(options[safeActiveIndex]);
    }
  };

  return (
    <div className="relative">
      <Input
        {...inputProps}
        className={className}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          safeActiveIndex >= 0 ? `${listId}-${safeActiveIndex}` : undefined
        }
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={(event) => {
          onFocus?.(event);
          setOpen(true);
        }}
        onBlur={(event) => {
          onBlur?.(event);
          close();
        }}
        onKeyDown={handleKeyDown}
      />
      {showPanel && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg bg-popover p-1 text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10">
          {showRecentLabel && (
            <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {recentLabel}
            </p>
          )}
          <div
            id={listId}
            role="listbox"
            className="max-h-72 overflow-y-auto overflow-x-hidden"
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                type="button"
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === safeActiveIndex}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
                onClick={() => selectOption(option)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left",
                  index === safeActiveIndex && "bg-muted text-foreground",
                )}
              >
                <span className="truncate">
                  <HighlightMatch text={option.value} query={value} />
                </span>
                {option.hint && (
                  <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
                    {option.hint}
                  </span>
                )}
              </button>
            ))}
          </div>
          {isFetching && options.length === 0 && (
            <p className="flex items-center gap-2 px-2 py-1.5 text-muted-foreground">
              <Spinner className="size-4" />
              Searching…
            </p>
          )}
        </div>
      )}
    </div>
  );
}
