import type { Language } from "./localization/resources";
import type { LocalizedText } from "./safetyInformationRegistry";

export const MAX_SCOPE_REQUEST_BYTES = 4_096;

export type ScopeLimitationCategory =
  | "rescue_dispatch"
  | "reports"
  | "payments"
  | "accounts"
  | "routes"
  | "forecasts"
  | "safety_guarantee";

export type ScopeRequestClassification =
  | {
      readonly kind: "scope_limitation";
      readonly category: ScopeLimitationCategory;
      readonly detectedLanguage: Language;
    }
  | { readonly kind: "not_scope_request" }
  | { readonly kind: "invalid_request" };

interface ScopePatternRule {
  readonly category: ScopeLimitationCategory;
  readonly language: Language;
  readonly patterns: readonly RegExp[];
}

const SCOPE_PATTERN_RULES: readonly ScopePatternRule[] = [
  {
    category: "rescue_dispatch",
    language: "en",
    patterns: [
      /\b(?:send|dispatch|request|need) (?:a )?(?:rescue|rescue team|emergency help)\b/u,
      /\brescue (?:me|us|my family)\b/u,
      /\b(?:arrange|track|monitor) (?:my )?rescue\b/u,
    ],
  },
  {
    category: "rescue_dispatch",
    language: "ms",
    patterns: [
      /\b(?:hantar|minta|perlukan) (?:pasukan )?(?:bantuan|penyelamat|bantuan menyelamat)\b/u,
      /\bselamatkan (?:saya|kami|keluarga saya)\b/u,
      /\b(?:jejak|pantau) (?:permintaan )?menyelamat\b/u,
    ],
  },
  {
    category: "reports",
    language: "en",
    patterns: [
      /\b(?:submit|send|post|make) (?:a )?(?:flood|incident|user) report\b/u,
      /\b(?:crowdsource|crowdsourced|community) report(?:s|ing)?\b/u,
      /\breport (?:a )?(?:flood|incident|road closure)\b/u,
    ],
  },
  {
    category: "reports",
    language: "ms",
    patterns: [
      /\b(?:hantar|buat|siar) laporan (?:banjir|kejadian|pengguna)\b/u,
      /\blapor (?:banjir|kejadian|jalan ditutup)\b/u,
      /\b(?:laporan penyumberan ramai|laporan komuniti)\b/u,
    ],
  },
  {
    category: "payments",
    language: "en",
    patterns: [
      /\b(?:make|send|accept) (?:a )?(?:payment|donation)\b/u,
      /\b(?:pay|donate|subscribe) (?:here|now|through the app|with this app)\b/u,
      /\b(?:payment|donation|subscription|financial transaction)s?\b/u,
    ],
  },
  {
    category: "payments",
    language: "ms",
    patterns: [
      /\b(?:buat|hantar|terima) (?:bayaran|pembayaran|derma|sumbangan)\b/u,
      /\b(?:bayar|menderma|langgan) (?:di sini|sekarang|melalui aplikasi)\b/u,
      /\b(?:bayaran|pembayaran|derma|sumbangan|langganan|transaksi kewangan)\b/u,
    ],
  },
  {
    category: "accounts",
    language: "en",
    patterns: [
      /\b(?:create|register|open|access|delete) (?:my |an )?account\b/u,
      /\b(?:sign|log) in\b/u,
      /\b(?:forgot|reset|change) (?:my )?password\b/u,
      /\bcross device (?:sync|synchronization)\b/u,
    ],
  },
  {
    category: "accounts",
    language: "ms",
    patterns: [
      /\b(?:cipta|daftar|buka|akses|padam) akaun\b/u,
      /\blog masuk\b/u,
      /\b(?:lupa|tetap semula|tukar) kata laluan\b/u,
      /\bpenyegerakan merentas peranti\b/u,
    ],
  },
  {
    category: "routes",
    language: "en",
    patterns: [
      /\b(?:calculate|plan|show|give|find) (?:me )?(?:an? )?(?:evacuation|safe|traffic aware) route\b/u,
      /\b(?:navigate|directions) to (?:a |the )?(?:shelter|evacuation centre|safe place)\b/u,
      /\bwhich (?:road|route|way) (?:is safe|should i take)\b/u,
    ],
  },
  {
    category: "routes",
    language: "ms",
    patterns: [
      /\b(?:kira|rancang|tunjuk|beri|cari) (?:saya )?laluan (?:pemindahan|selamat|berdasarkan trafik)\b/u,
      /\b(?:navigasi|arah) ke (?:pusat pemindahan|tempat perlindungan|tempat selamat)\b/u,
      /\b(?:jalan|laluan) mana (?:selamat|patut saya ambil)\b/u,
    ],
  },
  {
    category: "forecasts",
    language: "en",
    patterns: [
      /\b(?:forecast|predict) (?:the )?(?:flood|flooding|water level)\b/u,
      /\b(?:will|when will) (?:it |this area )?flood\b/u,
      /\bwater level prediction\b/u,
    ],
  },
  {
    category: "forecasts",
    language: "ms",
    patterns: [
      /\b(?:ramal|ramalkan) (?:banjir|paras air)\b/u,
      /\b(?:adakah|bila) (?:akan )?banjir\b/u,
      /\b(?:ramalan|jangkaan) (?:banjir|paras air)\b/u,
    ],
  },
  {
    category: "safety_guarantee",
    language: "en",
    patterns: [
      /\b(?:guarantee|confirm|promise) (?:that )?(?:i am|we are|this place is|this area is|my location is) (?:(?:currently|now) )?safe(?: (?:now|currently))?\b/u,
      /\b(?:is|are) (?:it|we|i|this place|this area|my location) (?:(?:currently|now) )?safe(?: (?:now|currently))?\b/u,
      /\btell me (?:that |whether )?(?:this place|this area|my location|we) (?:is|are) safe\b/u,
    ],
  },
  {
    category: "safety_guarantee",
    language: "ms",
    patterns: [
      /\b(?:jamin|sahkan|pastikan) (?:bahawa )?(?:saya|kami|tempat ini|kawasan ini|lokasi saya) selamat\b/u,
      /\badakah (?:saya|kami|tempat ini|kawasan ini|lokasi saya) selamat\b/u,
      /\bberitahu saya (?:bahawa |sama ada )?(?:tempat ini|kawasan ini|lokasi saya) selamat\b/u,
    ],
  },
];

export const SCOPE_LIMITATION_COPY: Readonly<
  Record<
    ScopeLimitationCategory,
    {
      readonly title: LocalizedText;
      readonly detail: LocalizedText;
    }
  >
> = {
  rescue_dispatch: {
    title: { en: "Rescue dispatch is unavailable", ms: "Penghantaran penyelamat tidak tersedia" },
    detail: {
      en: "BanjirReady cannot receive, dispatch, track, or monitor rescue requests.",
      ms: "BanjirReady tidak boleh menerima, menghantar, menjejak atau memantau permintaan menyelamat.",
    },
  },
  reports: {
    title: { en: "User reports are unavailable", ms: "Laporan pengguna tidak tersedia" },
    detail: {
      en: "BanjirReady does not accept incident reports, crowdsourced reports, social posts, or community moderation requests.",
      ms: "BanjirReady tidak menerima laporan kejadian, laporan penyumberan ramai, siaran sosial atau permintaan penyederhanaan komuniti.",
    },
  },
  payments: {
    title: { en: "Payments are unavailable", ms: "Pembayaran tidak tersedia" },
    detail: {
      en: "BanjirReady does not process payments, donations, subscriptions, or financial transactions.",
      ms: "BanjirReady tidak memproses pembayaran, derma, langganan atau transaksi kewangan.",
    },
  },
  accounts: {
    title: { en: "Accounts are unavailable", ms: "Akaun tidak tersedia" },
    detail: {
      en: "BanjirReady has no accounts, sign-in, authentication, or cross-device synchronization.",
      ms: "BanjirReady tidak mempunyai akaun, log masuk, pengesahan atau penyegerakan merentas peranti.",
    },
  },
  routes: {
    title: { en: "Route planning is unavailable", ms: "Perancangan laluan tidak tersedia" },
    detail: {
      en: "BanjirReady cannot calculate evacuation routes, provide navigation, use traffic-aware routing, or guarantee a safe route.",
      ms: "BanjirReady tidak boleh mengira laluan pemindahan, menyediakan navigasi, menggunakan laluan berdasarkan trafik atau menjamin laluan selamat.",
    },
  },
  forecasts: {
    title: { en: "Flood forecasts are unavailable", ms: "Ramalan banjir tidak tersedia" },
    detail: {
      en: "BanjirReady does not forecast floods or predict water levels.",
      ms: "BanjirReady tidak meramal banjir atau menjangka paras air.",
    },
  },
  safety_guarantee: {
    title: { en: "Current-safety guarantees are unavailable", ms: "Jaminan keselamatan semasa tidak tersedia" },
    detail: {
      en: "BanjirReady cannot state that a place is currently safe or guarantee current safety.",
      ms: "BanjirReady tidak boleh menyatakan bahawa sesuatu tempat selamat pada masa ini atau menjamin keselamatan semasa.",
    },
  },
};

function normalizeScopeRequest(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

export function classifyScopeRequest(input: unknown): ScopeRequestClassification {
  if (typeof input !== "string") {
    return { kind: "invalid_request" };
  }

  const encodedLength = new TextEncoder().encode(input).byteLength;
  if (
    encodedLength === 0 ||
    encodedLength > MAX_SCOPE_REQUEST_BYTES ||
    [...input].some(character => { const code = character.charCodeAt(0); return code <= 8 || code === 11 || code === 12 || (code >= 14 && code <= 31) || code === 127; })
  ) {
    return { kind: "invalid_request" };
  }

  const normalized = normalizeScopeRequest(input);
  if (normalized.length === 0) {
    return { kind: "invalid_request" };
  }

  for (const rule of SCOPE_PATTERN_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        kind: "scope_limitation",
        category: rule.category,
        detectedLanguage: rule.language,
      };
    }
  }

  return { kind: "not_scope_request" };
}
