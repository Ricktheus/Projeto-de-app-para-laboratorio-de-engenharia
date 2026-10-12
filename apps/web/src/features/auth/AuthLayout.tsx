import { BRAND } from '@concreto/shared';
import { type ReactNode } from 'react';

import { BrandGlyph, BrandMark } from '../../components/BrandMark';
import { FileText, QrCode, Timer } from '../../components/icons';

const PILLARS = [
  {
    icon: <Timer size={18} weight="bold" />,
    title: 'Nenhuma coleta perdida',
    text: 'Agenda do dia com o prazo de 24h de cada corpo de prova.',
  },
  {
    icon: <QrCode size={18} weight="bold" />,
    title: 'Rastreável do caminhão à prensa',
    text: 'Etiqueta QR impermeável no lugar do canetão.',
  },
  {
    icon: <FileText size={18} weight="bold" />,
    title: 'Laudo pré-pronto',
    text: 'Rascunho completo no último rompimento — só conferir e assinar.',
  },
];

/**
 * Split-screen layout for the unauthenticated pages (login, password reset):
 * a graphite brand panel with the product's promise, and the form on the right.
 * The brand panel collapses on small screens.
 */
export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-concreto-25 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-grafite p-12 lg:flex">
        {/* Oversized specimen glyph as a quiet backdrop. */}
        <div aria-hidden className="pointer-events-none absolute -right-24 top-24 opacity-[0.06]">
          <BrandGlyph size={520} />
        </div>
        <BrandMark size="lg" tone="light" />
        <div className="relative max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-sinal-500">
            Rastro · {BRAND.tagline}
          </p>
          <h2 className="mt-3 font-display text-[44px] font-semibold leading-[1.05] text-white">
            Do caminhão ao laudo assinado.
          </h2>
          <ul className="mt-10 flex flex-col gap-6">
            {PILLARS.map((p) => (
              <li key={p.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-sinal-500 ring-1 ring-white/10"
                >
                  {p.icon}
                </span>
                <div>
                  <p className="font-medium text-white">{p.title}</p>
                  <p className="text-concreto-400">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="hazard -mx-12 -mb-12 h-2" aria-hidden />
      </aside>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <header className="mb-8 flex flex-col gap-4">
            <div className="lg:hidden">
              <BrandMark size="lg" />
            </div>
            <div>
              <h1 className="font-display text-[30px] font-semibold leading-tight">{title}</h1>
              <p className="text-concreto-500">{subtitle}</p>
            </div>
          </header>
          {children}
        </div>
      </section>
    </main>
  );
}
