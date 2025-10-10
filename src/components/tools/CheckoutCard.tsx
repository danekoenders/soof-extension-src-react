interface CheckoutData {
  checkout_url: string;
  total_quantity: number;
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
  };
}

interface Props {
  checkout: CheckoutData;
}

// Currency symbol map (reused from ProductCard for consistency)
const currencySymbols: Record<string, string> = {
  AED: 'د.إ', AFN: '؋', ALL: 'L', AMD: '֏', ANG: '\u0192', AOA: 'Kz', ARS: '$', AUD: '$', AWG: '\u0192', AZN: '\u20BC', BAM: 'KM', BBD: '$', BDT: '\u09F3', BGN: 'лв', BHD: '.د.ب', BIF: 'FBu', BMD: '$', BND: '$', BOB: 'Bs.', BRL: 'R$', BSD: '$', BTN: 'Nu.', BWP: 'P', BYN: 'Br', BZD: '$', CAD: '$', CDF: 'FC', CHF: 'Fr.', CLP: '$', CNY: '¥', COP: '$', CRC: '\u20A1', CVE: '$', CZK: 'Kč', DJF: 'Fdj', DKK: 'kr', DOP: 'RD$', DZD: 'دج', EGP: 'ج.م', ERN: 'Nfk', ETB: 'Br', EUR: '€', FJD: '$', FKP: '£', GBP: '£', GEL: '₾', GHS: '₵', GIP: '£', GMD: 'D', GNF: 'FG', GTQ: 'Q', GYD: '$', HKD: '$', HNL: 'L', HRK: 'kn', HTG: 'G', HUF: 'Ft', IDR: 'Rp', ILS: '₪', INR: '₹', IQD: 'ع.د', IRR: '﷼', ISK: 'kr', JEP: '£', JMD: 'J$', JOD: 'د.ا', JPY: '¥', KES: 'KSh', KGS: 'лв', KHR: '៛', KID: '$', KMF: 'CF', KRW: '₩', KWD: 'د.ك', KYD: '$', KZT: '₸', LAK: '₭', LBP: 'ل.ل', LKR: '₨', LRD: '$', LSL: 'L', LTL: 'Lt', LVL: 'Ls', LYD: 'ل.د', MAD: 'د.م.', MDL: 'L', MGA: 'Ar', MKD: 'ден', MMK: 'K', MNT: '₮', MOP: 'P', MRU: 'UM', MUR: '₨', MVR: 'Rf', MWK: 'MK', MXN: '$', MYR: 'RM', MZN: 'MT', NAD: '$', NGN: '₦', NIO: 'C$', NOK: 'kr', NPR: '₨', NZD: '$', OMR: 'ر.ع.', PAB: 'B/.', PEN: 'S/', PGK: 'K', PHP: '₱', PKR: '₨', PLN: 'zł', PYG: '₲', QAR: 'ر.ق', RON: 'lei', RSD: 'дин', RUB: '₽', RWF: 'FRw', SAR: 'ر.س', SBD: '$', SCR: '₨', SDG: 'ج.س.', SEK: 'kr', SGD: '$', SHP: '£', SLL: 'Le', SOS: 'S', SRD: '$', SSP: '£', STN: 'Db', SYP: '£', SZL: 'E', THB: '฿', TJS: 'ЅМ', TMT: 'm', TND: 'د.ت', TOP: 'T$', TRY: '₺', TTD: 'TT$', TWD: 'NT$', TZS: 'Sh', UAH: '₴', UGX: 'USh', USD: '$', UYU: '$U', UZS: 'soʻm', VED: 'Bs.', VES: 'Bs.S', VND: '₫', VUV: 'VT', WST: 'T', XAF: 'FCFA', XCD: '$', XOF: 'CFA', XPF: '₣', YER: '﷼', ZAR: 'R', ZMW: 'ZK',
};

export default function CheckoutCard({ checkout }: Props) {
  const { checkout_url, total_quantity, cost } = checkout;
  const { amount, currencyCode } = cost.totalAmount;
  
  // Format the price
  const currencySymbol = currencySymbols[currencyCode] || currencyCode;
  const formattedPrice = `${currencySymbol}${parseFloat(amount).toFixed(2)}`;
  
  // Pluralize items text
  const itemsText = total_quantity === 1 ? 'item' : 'items';

  return (
    <a
      href={checkout_url}
      target="_blank"
      rel="noopener noreferrer"
      className="no-underline block"
    >
      <div className="p-2.5 w-full rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow text-black cursor-pointer">
        <div className="flex gap-2.5 items-center">
          {/* Cart icon on left - matches ProductCard image positioning */}
          <div className="flex items-center justify-center w-16 h-16 rounded bg-blue-50 flex-shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-blue-600"
            >
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
          </div>
          
          {/* Content on right - matches ProductCard layout */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="flex flex-col gap-0.5">
              <strong className="text-xs leading-tight">Winkelwagen</strong>
              <span className="text-[10px] text-gray-500">
                {total_quantity} {itemsText}
              </span>
              <span className="text-xs font-semibold text-blue-600 mt-0.5">
                {formattedPrice}
              </span>
            </div>
            
            {/* Checkout button - compact like ProductCard variants */}
            <div className="mt-1.5">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors">
                <span>Afrekenen</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a>
  );
}

