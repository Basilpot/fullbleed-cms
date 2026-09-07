"use client";

import StepButton from "@/components/atoms/step-button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProductStore } from "@/store/useProductStore";
import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";

const STEPS = [
  "Basic Information",
  "Gallery",
  "Pricing",
  "Variants",
  "Attributes",
  "Categorization",
  "FAQ",
  "SEO",
];

function LayoutContent({ children }: Readonly<{ children: React.ReactNode }>) {
  const searchParams = useSearchParams();
  const isEdit = searchParams?.get("id") || null;
  const currStep = useProductStore((step) => step.currentStep);

  return (
    <div className="flex w-full max-w-screen mx-auto">
      <nav className="bg-gray-100 dark:bg-gray-900 mb-6 min-h-screen sticky top-0 w-65 rounded-md pt-4">
        <ScrollArea className="">
          <ul className="@container flex items-start justify-start gap-2 flex-col">            {STEPS.map((stepText, i) => (
              <li key={stepText}>
                <StepButton stepNumber={i + 1} stepText={stepText} />
              </li>
            ))}
          </ul>
        </ScrollArea>
      </nav>

      <section className="flex-1 px-6">
        <div className="flex justify-between pr-4">
          <h2 className="font-bold text-xl mb-6">{STEPS[currStep - 1]}</h2>
          <div className="flex gap-1">
            <Button
              type="button"
              onClick={() =>
                window.dispatchEvent(new CustomEvent("product-form:cancel"))
              }
              size={"lg"}
              variant={"secondary"}
            >
              Cancel
            </Button>
            {isEdit && (
              <Button
                type="submit"
                form="productform"
                className="cursor-pointer"
                size={"lg"}
              >
                Save
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="h-[calc(100vh-4rem)] w-full">
          <div className="p-4">{children}</div>
        </ScrollArea>
      </section>
    </div>
  );
}

export default function CreateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LayoutContent>{children}</LayoutContent>
    </Suspense>
  );
}
