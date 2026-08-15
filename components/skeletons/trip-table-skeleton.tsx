import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";

export function TripTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">SN</TableHead>
          <TableHead className="w-24">Thumbnail</TableHead>
          <TableHead className="flex-1">Title</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Capacity</TableHead>
          <TableHead>Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRow key={i}>
            {/* SN */}
            <TableCell>
              <div className="h-4 w-6 animate-pulse rounded bg-muted" />
            </TableCell>

            {/* Thumbnail */}
            <TableCell>
              <div className="h-16 w-20 animate-pulse rounded bg-muted" />
            </TableCell>

            {/* Title */}
            <TableCell>
              <div className="space-y-2">
                <div className="h-4 w-64 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </TableCell>

            {/* Slug */}
            <TableCell>
              <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            </TableCell>

            {/* Duration */}
            <TableCell>
              <div className="h-4 w-16 animate-pulse rounded bg-muted" />
            </TableCell>

            {/* Capacity */}
            <TableCell>
              <div className="h-4 w-8 animate-pulse rounded bg-muted" />
            </TableCell>

            {/* Price */}
            <TableCell>
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </TableCell>

            {/* Status */}
            <TableCell>
              <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
            </TableCell>

            {/* Menu */}
            <TableCell>
              <div className="h-4 w-4 animate-pulse rounded bg-muted" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
