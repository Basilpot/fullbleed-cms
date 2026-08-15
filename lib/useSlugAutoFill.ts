"use client";

import { useEffect, useRef } from "react";
import { useWatch, type Control, type UseFormSetValue } from "react-hook-form";
import { generateSlug } from "@/lib/generateSlug";

export function useSlugAutoFill(
  control: Control<any>,
  setValue: UseFormSetValue<any>,
  titleName = "title",
  slugName = "slug",
) {
  const title = (useWatch({ control, name: titleName }) as string) ?? "";
  const slug = (useWatch({ control, name: slugName }) as string) ?? "";
  const lastTitle = useRef(title);

  useEffect(() => {
    const generated = generateSlug(title);
    // Overwrite only while the field is empty or still holds the value
    // generated from the previous title (i.e. the user hasn't typed their own).
    const stillAuto = !slug || slug === generateSlug(lastTitle.current);
    if (generated && stillAuto) {
      setValue(slugName, generated, { shouldValidate: false });
    }
    lastTitle.current = title;
  }, [title, slug, slugName, setValue]);
}
