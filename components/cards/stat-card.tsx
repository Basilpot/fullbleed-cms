import {
  Card,
  CardHeader,
  CardDescription,
  CardTitle,
  CardAction,
  CardFooter,
} from "../ui/card";

type CardProps = {
  title?: string;
  value: string | number | undefined;
  icon: any;
  description?: string;
};

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
}: CardProps) => {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{title ?? ""}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {value}
        </CardTitle>
        <CardAction>
            <Icon />
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="text-muted-foreground">{description ?? ""}</div>
      </CardFooter>
    </Card>
  );
};
