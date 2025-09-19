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
    <div className="px-3 py-3 w-fit rounded-[1px_20px_20px_20px] border border-gray-200 bg-blue-50 max-w-[90%] text-black">
      <a
        href={cardHref}
        target="_blank"
        rel="noopener noreferrer"
        className="no-underline text-inherit flex items-center gap-3"
      >
        {displayImage && (
        <img
            src={displayImage}
            alt={displayTitle}
            className="w-20 h-20 object-cover rounded-md"
        />
      )}
      <div className="flex flex-col gap-1">
        <strong className="text-base">{title}</strong>
          {variants && variants.length > 0 && (
            <span className="text-xs text-gray-600">{displayTitle}</span>
          )}
        {priceText && <span className="text-sm">{priceText}</span>}
      </div>
      </a>
      {/* Variant switcher */}
      {variants && variants.length > 1 && (
        <div className="mt-2 flex gap-2">
          {variants.map((variant, idx) => {
            return (
              <a
                key={variant.variant_id}
                rel="noopener noreferrer"
                className="no-underline"
                onClick={e => {
                  setSelectedVariantIdx(idx);
                  if (!variant.available) e.preventDefault();
                }}
              >
                <button
                  type="button"
                  className={`px-2.5 py-1 rounded text-gray-800 cursor-pointer transition-all ${
                    idx === selectedVariantIdx 
                      ? 'border-2 border-blue-600 bg-blue-50 font-bold' 
                      : 'border border-gray-300 bg-gray-50 font-normal'
                  } ${
                    variant.available ? 'opacity-100' : 'opacity-50 cursor-not-allowed'
                  }`}
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
