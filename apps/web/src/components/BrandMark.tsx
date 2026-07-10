import { BRAND } from '@concreto/shared';

export interface BrandMarkProps {
  /** Larger mark + name for hero/login surfaces; smaller for inline headers. */
  size?: 'sm' | 'lg';
  /** Show the tagline under the name (default true on `lg`). */
  tagline?: boolean;
}

/**
 * Laboratory brand mark (QW-21): an inline-SVG glyph (a cast concrete cylinder —
 * the specimen the lab tests) plus the wordmark. Self-contained (no external
 * asset — CSP/artifact-safe) and used across the anonymous "vitrine" surfaces
 * (login, client portal, public validation) so third parties — fiscais,
 * auditorias — see a consistent identity. Swap {@link BRAND} to rebrand.
 */
export function BrandMark({ size = 'lg', tagline }: BrandMarkProps) {
  const showTagline = tagline ?? size === 'lg';
  const glyph = size === 'lg' ? 40 : 28;
  return (
    <div className="flex items-center gap-3">
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 40 40"
        role="img"
        aria-label={`${BRAND.nome} — logotipo`}
        className="shrink-0 text-brand"
      >
        {/* Concrete test cylinder (h/d = 2): the specimen the lab ruptures. */}
        <ellipse
          cx="20"
          cy="8"
          rx="11"
          ry="4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path
          d="M9 8 v24 a11 4 0 0 0 22 0 V8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <line
          x1="9"
          y1="20"
          x2="31"
          y2="20"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.5"
        />
      </svg>
      <div className="flex flex-col">
        <span
          className={`font-bold leading-tight text-gray-900 ${size === 'lg' ? 'text-xl' : 'text-base'}`}
        >
          {BRAND.nome}
        </span>
        {showTagline ? <span className="text-sm text-gray-500">{BRAND.tagline}</span> : null}
      </div>
    </div>
  );
}
