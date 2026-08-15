"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getFullImageUrl } from "@/lib/getFullImageUrl";
import { formatStatus } from "@/components/atoms/status-badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function ProductPreviewContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const slug = searchParams.get("slug");
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id && !slug) return;
    let mounted = true;
    const load = async () => {
      try {
        // ponytail: by-id (admin, includes drafts) when editing, else public by slug
        const url = id
          ? `/api/products/by-id/${id}`
          : `/api/products/${slug}`;
        const res = await fetch(url, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Failed to fetch product");
        const data = (await res.json()).data;
        if (mounted) setProduct(data);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [id, slug]);

  if (!id && !slug) {
    return (
      <div className="py-32 text-center">
        <p className="text-red-500">No product provided</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading preview...
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="py-32 text-center">
        <p className="text-red-500">{error || "Product not found"}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/products">Back to Products</Link>
        </Button>
      </div>
    );
  }

  const cover = product.images?.[0];
  const price = product.price != null ? Number(product.price) : null;
  const maxPrice = product.maxPrice != null ? Number(product.maxPrice) : null;
  const compareAt = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const formatPrice = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
  const listItems = (arr: any) => (Array.isArray(arr) ? arr.filter(Boolean) : []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="outline" size="sm">
          <Link href="/products">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Products
          </Link>
        </Button>
        <Badge
          variant="outline"
          className={cn(
            formatStatus(product.status)?.color,
            "text-white",
          )}
        >
          {formatStatus(product.status)?.icon} {formatStatus(product.status)?.text}
        </Badge>
      </div>

      {cover && (
        <div className="relative mb-6 aspect-[16/8] overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={getFullImageUrl(cover)}
            alt={product.title || "Product cover"}
            className="h-full w-full object-cover"
          />
        </div>
      )}

      {listItems(product.images).length > 1 && (
        <section className="mb-6">
          <h2 className="mb-3 text-xl font-semibold">
            Photos ({listItems(product.images).length})
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {listItems(product.images).map((src: string, i: number) => (
              <div key={i} className="aspect-[4/3] overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getFullImageUrl(src)}
                  alt={`${product.title || "Product"} photo ${i + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {product.videoIntro && (
        <section className="mb-6">
          <h2 className="mb-3 text-xl font-semibold">Video</h2>
          <div className="aspect-video overflow-hidden rounded-lg border">
            <iframe
              src={product.videoIntro}
              title="Product video"
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        </section>
      )}

      <h1 className="text-3xl font-bold tracking-tight">{product.title}</h1>
      {product.slug && (
        <p className="mt-1 text-sm text-muted-foreground">{product.slug}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
        {product.category?.name && (
          <span>Category: {product.category.name}</span>
        )}
        {product.brand?.name && <span>Brand: {product.brand.name}</span>}
        {listItems(product.tags).length > 0 && (
          <span>Tags: {product.tags.map((t: any) => t.name).join(", ")}</span>
        )}
      </div>

      {price != null && (
        <div className="mt-4 text-lg font-semibold">
          {compareAt != null && compareAt > 0 && (
            <span className="mr-2 text-muted-foreground line-through">
              {formatPrice(compareAt)}
            </span>
          )}
          {formatPrice(price)}
          {maxPrice != null && maxPrice > price && (
            <span className="text-muted-foreground"> – {formatPrice(maxPrice)}</span>
          )}
        </div>
      )}

      {product.description && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Description</h2>
          <div
            className="tiptap prose prose-sm sm:prose-base max-w-none"
            dangerouslySetInnerHTML={{ __html: product.description }}
          />
        </section>
      )}

      {listItems(product.attributes).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Specifications</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <tbody>
                {product.attributes.map((attr: any, i: number) => (
                  <tr key={i} className={i % 2 ? "bg-muted/30" : ""}>
                    <td className="px-4 py-2 font-medium">{attr.name}</td>
                    <td className="px-4 py-2">{attr.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {listItems(product.variants).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">Variants</h2>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">SKU</th>
                  <th className="px-4 py-2 text-left font-medium">Price</th>
                  <th className="px-4 py-2 text-left font-medium">Stock</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((v: any, i: number) => (
                  <tr key={i} className={i % 2 ? "bg-muted/30" : ""}>
                    <td className="px-4 py-2 font-medium">
                      {v.image && (
                        <img
                          src={getFullImageUrl(v.image)}
                          alt=""
                          className="mr-2 inline-block h-8 w-8 rounded-sm object-cover"
                        />
                      )}
                      {v.name}
                    </td>
                    <td className="px-4 py-2">{v.sku || "—"}</td>
                    <td className="px-4 py-2">
                      {v.price != null ? formatPrice(Number(v.price)) : "—"}
                    </td>
                    <td className="px-4 py-2">{v.stock ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {listItems(product.faq).length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-semibold">FAQ</h2>
          <div className="space-y-3">
            {product.faq
              .flatMap((f: any) =>
                f?.q !== undefined
                  ? [f]
                  : Array.isArray(f?.items)
                    ? f.items
                    : [],
              )
              .filter((item: any) => item?.q)
              .map((item: any, i: number) => (
                <div key={i} className="rounded-lg border p-4 text-sm">
                  <p className="font-medium">{item.q}</p>
                  {item.a && (
                    <div
                      className="mt-0.5 text-muted-foreground"
                      dangerouslySetInnerHTML={{ __html: item.a }}
                    />
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ProductPreviewPage() {
  return (
    <Suspense fallback={<div className="py-32 text-center text-muted-foreground">Loading preview...</div>}>
      <ProductPreviewContent />
    </Suspense>
  );
}
