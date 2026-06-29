import { Breadcrumb } from "@/components/Breadcrumb";

export function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  return <Breadcrumb items={items} />;
}
