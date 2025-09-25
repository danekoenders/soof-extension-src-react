import type { ProductMeta, ProductVariant } from "../types/product";

export function normalizeVariant(input: any): ProductVariant | null {
  if (!input) return null;
  const id = input.variant_id || input.id;
  if (!id) return null;
  return {
    variant_id: String(id),
    title: String(input.title ?? ""),
    price: String(input.price ?? ""),
    currency: String(input.currency ?? ""),
    available: Boolean(input.available),
    image_url: input.image_url ? String(input.image_url) : undefined,
  };
}

export function normalizeProduct(input: any): ProductMeta | null {
  if (!input) return null;
  const product: ProductMeta = {
    title: String(input.title ?? ""),
    description: input.description ? String(input.description) : undefined,
    image_url: input.image_url ? String(input.image_url) : undefined,
    price_range: input.price_range
      ? {
          min: String(input.price_range.min ?? ""),
          max: String(input.price_range.max ?? ""),
          currency: String(input.price_range.currency ?? ""),
        }
      : undefined,
    product_id: input.product_id ? String(input.product_id) : undefined,
    variants: Array.isArray(input.variants)
      ? input.variants.map(normalizeVariant).filter(Boolean) as ProductVariant[]
      : undefined,
  };
  return product;
}

export function normalizeProducts(inputs: any[]): ProductMeta[] {
  if (!Array.isArray(inputs)) return [];
  return inputs.map(normalizeProduct).filter(Boolean) as ProductMeta[];
}


