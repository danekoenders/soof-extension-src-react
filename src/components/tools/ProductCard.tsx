import { useState } from "react";
import { useHost } from "../../hooks/useHost";

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
    variant_id: string;
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

// Currency symbol map based on Shopify CurrencyCode enum
const currencySymbols: Record<string, string> = {
  AED: 'د.إ', AFN: '؋', ALL: 'L', AMD: '֏', ANG: '\u0192', AOA: 'Kz', ARS: '$', AUD: '$', AWG: '\u0192', AZN: '\u20BC', BAM: 'KM', BBD: '$', BDT: '\u09F3', BGN: 'лв', BHD: '.د.ب', BIF: 'FBu', BMD: '$', BND: '$', BOB: 'Bs.', BRL: 'R$', BSD: '$', BTN: 'Nu.', BWP: 'P', BYN: 'Br', BZD: '$', CAD: '$', CDF: 'FC', CHF: 'Fr.', CLP: '$', CNY: '¥', COP: '$', CRC: '\u20A1', CVE: '$', CZK: 'Kč', DJF: 'Fdj', DKK: 'kr', DOP: 'RD$', DZD: 'دج', EGP: 'ج.م', ERN: 'Nfk', ETB: 'Br', EUR: '€', FJD: '$', FKP: '£', GBP: '£', GEL: '₾', GHS: '₵', GIP: '£', GMD: 'D', GNF: 'FG', GTQ: 'Q', GYD: '$', HKD: '$', HNL: 'L', HRK: 'kn', HTG: 'G', HUF: 'Ft', IDR: 'Rp', ILS: '₪', INR: '₹', IQD: 'ع.د', IRR: '﷼', ISK: 'kr', JEP: '£', JMD: 'J$', JOD: 'د.ا', JPY: '¥', KES: 'KSh', KGS: 'лв', KHR: '៛', KID: '$', KMF: 'CF', KRW: '₩', KWD: 'د.ك', KYD: '$', KZT: '₸', LAK: '₭', LBP: 'ل.ل', LKR: '₨', LRD: '$', LSL: 'L', LTL: 'Lt', LVL: 'Ls', LYD: 'ل.د', MAD: 'د.م.', MDL: 'L', MGA: 'Ar', MKD: 'ден', MMK: 'K', MNT: '₮', MOP: 'P', MRU: 'UM', MUR: '₨', MVR: 'Rf', MWK: 'MK', MXN: '$', MYR: 'RM', MZN: 'MT', NAD: '$', NGN: '₦', NIO: 'C$', NOK: 'kr', NPR: '₨', NZD: '$', OMR: 'ر.ع.', PAB: 'B/.', PEN: 'S/', PGK: 'K', PHP: '₱', PKR: '₨', PLN: 'zł', PYG: '₲', QAR: 'ر.ق', RON: 'lei', RSD: 'дин', RUB: '₽', RWF: 'FRw', SAR: 'ر.س', SBD: '$', SCR: '₨', SDG: 'ج.س.', SEK: 'kr', SGD: '$', SHP: '£', SLL: 'Le', SOS: 'S', SRD: '$', SSP: '£', STN: 'Db', SYP: '£', SZL: 'E', THB: '฿', TJS: 'ЅМ', TMT: 'm', TND: 'د.ت', TOP: 'T$', TRY: '₺', TTD: 'TT$', TWD: 'NT$', TZS: 'Sh', UAH: '₴', UGX: 'USh', USD: '$', UYU: '$U', UZS: 'soʻm', VED: 'Bs.', VES: 'Bs.S', VND: '₫', VUV: 'VT', WST: 'T', XAF: 'FCFA', XCD: '$', XOF: 'CFA', XPF: '₣', YER: '﷼', ZAR: 'R', ZMW: 'ZK',
};

// Helper to extract digits from Shopify GID
function extractVariantId(gid: string) {
  const match = gid.match(/(\d+)$/);
  return match ? match[1] : gid;
}

export default function ProductCard({ product }: Props) {
  const host = useHost();
  const { title, image_url, price_range, variants } = product;
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);

  let priceText: string | undefined = undefined;
  let selectedVariant = undefined;
  let displayTitle = title;
  let displayImage = image_url;

  if (variants && variants.length > 0) {
    selectedVariant = variants[selectedVariantIdx];
    displayTitle = selectedVariant.title || title;
    displayImage = selectedVariant.image_url || image_url;
    priceText = `${currencySymbols[selectedVariant.currency] || selectedVariant.currency} ${selectedVariant.price}`;
  } else if (price_range) {
    priceText = `${currencySymbols[price_range.currency] || price_range.currency} ${price_range.min} - ${price_range.max}`;
  }

  // Determine link target
  const variantId = selectedVariant?.variant_id ? extractVariantId(selectedVariant.variant_id) : undefined;
  const cardHref = variantId ? `${host}/variants/${variantId}` : undefined;

  return (
    <div className="message">
      <a
        href={cardHref}
        target="_blank"
        rel="noopener noreferrer"
        style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 }}
      >
        {displayImage && (
        <img
            src={displayImage}
            alt={displayTitle}
          style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <strong>{title}</strong>
          {variants && variants.length > 0 && (
            <span style={{ fontSize: 13, color: '#555' }}>{displayTitle}</span>
          )}
        {priceText && <span style={{ fontSize: 14 }}>{priceText}</span>}
      </div>
      </a>
      {/* Variant switcher */}
      {variants && variants.length > 1 && (
        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          {variants.map((variant, idx) => {
            return (
              <a
                key={variant.variant_id}
                rel="noopener noreferrer"
                style={{ textDecoration: "none" }}
                onClick={e => {
                  setSelectedVariantIdx(idx);
                  if (!variant.available) e.preventDefault();
                }}
              >
                <button
                  type="button"
                  style={{
                    padding: "4px 10px",
                    borderRadius: 4,
                    border: idx === selectedVariantIdx ? "2px solid #0081b1" : "1px solid #ccc",
                    background: idx === selectedVariantIdx ? "#e6f7ff" : "#fafbfc",
                    color: "#222",
                    cursor: variant.available ? "pointer" : "not-allowed",
                    fontWeight: idx === selectedVariantIdx ? "bold" : "normal",
                    opacity: variant.available ? 1 : 0.5,
                  }}
                  disabled={!variant.available}
                  title={variant.available ? undefined : "Not available"}
                >
                  {variant.title}
                </button>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
