import { BRAND } from '@concreto/shared';

export interface BrandMarkProps {
  /** Larger mark + name for hero/login surfaces; smaller for inline headers. */
  size?: 'sm' | 'lg';
  /** Show the tagline under the name (default true on `lg`). */
  tagline?: boolean;
  /** `light` renders the wordmark for dark (graphite) backgrounds. */
  tone?: 'dark' | 'light';
}

/**
 * Glyph only: a cast test cylinder (h/d = 2) in signal yellow on a graphite
 * tile — the specimen the lab ruptures, in the "Concreto & Sinalização" palette.
 */
export function BrandGlyph({ size = 36, label }: { size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0"
    >
      <rect width="40" height="40" rx="9" fill="#17181A" />
      <ellipse cx="20" cy="11" rx="8" ry="3" fill="none" stroke="#FFC21A" strokeWidth="2.4" />
      <path
        d="M12 11 v17 a8 3 0 0 0 16 0 V11"
        fill="none"
        stroke="#FFC21A"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      {/* Fracture line: the cone-and-split failure the press produces. */}
      <path
        d="M17 15 l4 5 -3 3 4 5"
        fill="none"
        stroke="#FFC21A"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * Laboratory brand mark (QW-21, redesigned): glyph + wordmark. Self-contained
 * (inline SVG — CSP/artifact-safe) and used across the external surfaces (login,
 * client portal, public validation). Swap {@link BRAND} to rebrand.
 */
export function BrandMark({ size = 'lg', tagline, tone = 'dark' }: BrandMarkProps) {
  const showTagline = tagline ?? size === 'lg';
  return (
    <div className="flex items-center gap-3">
      <BrandGlyph size={size === 'lg' ? 44 : 32} label={`${BRAND.nome} — logotipo`} />
      <div className="flex flex-col">
        <span
          className={[
            'font-display font-semibold leading-tight tracking-[0.01em]',
            size === 'lg' ? 'text-[22px]' : 'text-[17px]',
            tone === 'light' ? 'text-white' : 'text-ink',
          ].join(' ')}
        >
          {BRAND.nome}
        </span>
        {showTagline ? (
          <span
            className={`text-[13px] ${tone === 'light' ? 'text-concreto-300' : 'text-concreto-500'}`}
          >
            {BRAND.tagline}
          </span>
        ) : null}
      </div>
    </div>
  );
}
