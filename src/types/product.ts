export interface PriceRange {
  min: string;
  max: string;
  currency: string;
}

export interface ProductVariant {
  variant_id: string;
  title: string;
  price: string;
  currency: string;
  available: boolean;
  image_url?: string;
}

export interface ProductMeta {
  title: string;
  description?: string;
  image_url?: string;
  price_range?: PriceRange;
  product_id?: string;
  variants?: ProductVariant[];
}


