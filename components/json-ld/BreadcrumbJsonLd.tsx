import { JsonLd } from "@/components/JsonLd";
import { breadcrumbSchema } from "@/lib/schema";

export function BreadcrumbJsonLd({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <JsonLd
      data={breadcrumbSchema(
        items.map((item) => ({
          name: item.label,
          path: item.href || ""
        }))
      )}
    />
  );
}
