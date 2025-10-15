import { useState } from "react";
import { useHost } from "../../hooks/useHost";
import type { ProductMeta } from "../../types/product";

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
    <div className="max-w-[300px] p-2.5 rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow text-black">
      <div className="flex gap-2.5">
        {/* Image on left */}
        <a
          href={cardHref}
          target="_blank"
          rel="noopener noreferrer"
          className="no-underline flex items-center"
        >
          {displayImage && (
            <img
              src={displayImage}
              alt={displayTitle}
              className="w-16 h-16 object-contain rounded"
            />
          )}
        </a>
        
        {/* Content on right */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <a
            href={cardHref}
            target="_blank"
            rel="noopener noreferrer"
            className="no-underline text-inherit"
          >
            <div className="flex flex-col gap-0.5">
              <strong className="text-xs leading-tight line-clamp-1">{title}</strong>
              {variants && variants.length === 1 && (
                <span className="text-[10px] text-gray-500 line-clamp-1">{displayTitle}</span>
              )}
              {priceText && <span className="text-xs font-semibold text-blue-600 mt-0.5">{priceText}</span>}
            </div>
          </a>
          
          {/* Variant switcher - compact horizontal */}
          {variants && variants.length > 1 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
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
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer transition-all ${
                        idx === selectedVariantIdx 
                          ? 'border border-blue-600 bg-blue-50 text-blue-700 font-semibold' 
                          : 'border border-gray-200 bg-white text-gray-700'
                      } ${
                        variant.available ? 'opacity-100' : 'opacity-40 cursor-not-allowed'
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
      </div>
    </div>
  );
}
