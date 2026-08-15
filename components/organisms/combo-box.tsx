"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type TComboBoxProps = {
  options: {
    value: string;
    label: string;
  }[];
  dValue?: string;
  placeholder: string;
  notFoundPlaceholder: string;
  value: string;
  setValue: any;
  error?: boolean;
};

export function Combobox({
  options,
  placeholder,
  notFoundPlaceholder,
  value,
  setValue,
  dValue,
  error,
}: Readonly<TComboBoxProps>) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!value && options?.length > 0) {
      setValue(options[0].value); // select the first option by default
    }
  }, [value, options, setValue]);

  return (
    <Popover open={open} onOpenChange={setOpen} >
      <PopoverTrigger asChild className="rounded-sm">
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            error && "border-destructive focus-visible:ring-destructive/50",
          )}
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full! rounded-sm p-0">
        <Command className="w-full!">
          <CommandInput placeholder={placeholder} className="h-9" />
          <CommandList className="w-full!">
            <CommandEmpty className="w-full! p-2">{notFoundPlaceholder}</CommandEmpty>
            <CommandGroup className="w-full!">
              {options?.map((option) => (
                <CommandItem
                className="w-full!"
                  key={option.value}
                  value={option.value ?? dValue}
                  onSelect={(currentValue) => {
                    setValue(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
