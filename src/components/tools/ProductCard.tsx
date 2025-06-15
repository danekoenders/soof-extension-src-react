export interface PriceRange {
  min: string;
  max: string;
  currency: string;
}

export interface ProductMeta {
  title: string;
  description?: string;
  image_url?: string;
  price_range?: PriceRange;
  product_id?: string;
  variants?: Array<{
    title: string;
    price: string;
    currency: string;
    available: boolean;
    image_url?: string;
  }>;
}

interface Props {
  product: ProductMeta;
}

export default function ProductCard({ product }: Props) {
  const { title, image_url, price_range, description } = product;
  const priceText = price_range
    ? `${price_range.currency} ${price_range.min} - ${price_range.max}`
    : undefined;
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        border: "1px solid var(--primary-border, #e3e3e3)",
        borderRadius: 8,
        padding: 10,
        background: "var(--bot-chat-background, #fff)",
        maxWidth: 350,
      }}
    >
      {image_url && (
        <img
          src={image_url}
          alt={title}
          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong>{title}</strong>
        {priceText && <span style={{ fontSize: 14 }}>{priceText}</span>}
        {description && (
          <p style={{ fontSize: 12, margin: 0, color: "var(--accent-text, #0081b1)" }}>
            {description}
          </p>
        )}
      </div>
    </div>
  );
} 