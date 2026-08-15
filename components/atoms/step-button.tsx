import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProductStore } from "@/store/useProductStore";

type TStepProps = {
  stepNumber: number;
  stepText: string;
};

export default function StepButton({
  stepNumber,
  stepText,
}: Readonly<TStepProps>) {
  const step = useProductStore((state: any) => state.currentStep);
  const setStepCount = useProductStore((state: any) => state.setStep);
  const stepErrors = useProductStore((state: any) => state.stepErrors);
  const hasErrors = (stepErrors?.[stepNumber]?.length ?? 0) > 0;

  return (
    <Button
      className={cn(
        step == stepNumber
          ? "bg-primary border-l-primary border-l-2 w-full text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
          : "border-l-secondary hover:bg-primary hover:text-primary-foreground",
        hasErrors &&
          "text-destructive hover:text-destructive border-l-destructive bg-destructive/10",
        "rounded-none w-full hover:border-l-primary border-l-2 w-[100cqw] flex justify-start",
      )}
      variant={"ghost"}
      onClick={() => {
        setStepCount(stepNumber);
      }}
    >
      {stepText}
    </Button>
  );
}
