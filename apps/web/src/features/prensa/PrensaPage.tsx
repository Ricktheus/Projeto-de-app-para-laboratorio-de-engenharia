import { AppShell } from '../../components/AppShell';
import { ChartLineUp, DeviceMobile } from '../../components/icons';
import { Card } from '../../components/ui';

const STEPS = [
  {
    title: 'Bipe o QR do CP',
    text: 'O app abre o CP certo e mostra a idade e o prazo de ruptura.',
  },
  {
    title: 'Registre carga e dimensões',
    text: 'Carga (kgf), peso e dimensões; o MPa é calculado na hora.',
  },
  {
    title: 'Classifique a fratura',
    text: 'Guia visual dos tipos de ruptura. O laudo se completa no último rompimento.',
  },
];

/**
 * Press home (eng_lab) on web.
 * The real flow runs in the mobile app (camera, QR scan, Bluetooth printer); on
 * the web this page explains it instead of showing a misleading empty list
 * (plan §6.11 — "nenhuma tela mente").
 */
export function PrensaPage() {
  return (
    <AppShell title="Bancada" subtitle="Rompimento dos corpos de prova na prensa.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Como funciona" icon={<ChartLineUp size={18} />}>
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-grafite font-display text-[15px] font-semibold text-sinal-500">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-grafite">{step.title}</p>
                  <p className="text-concreto-500">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <div className="flex flex-col items-start gap-3 rounded-xl bg-grafite p-6 text-white">
          <DeviceMobile size={28} className="text-sinal-500" aria-hidden />
          <p className="font-display text-[22px] font-semibold leading-tight">
            Use o app no celular
          </p>
          <p className="text-concreto-300">
            A bancada da prensa roda no aplicativo, com botões grandes para uso de luva.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
