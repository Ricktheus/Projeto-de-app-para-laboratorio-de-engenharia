import { AppShell } from '../../components/AppShell';
import { ClipboardText, DeviceMobile } from '../../components/icons';
import { Card } from '../../components/ui';

const STEPS = [
  {
    title: 'Fotografe a nota fiscal',
    text: 'Os dados da NF (número, fck, volume, concreteira) são lidos automaticamente para conferência.',
  },
  {
    title: 'Molde e etiquete os CPs',
    text: 'Cada corpo de prova recebe uma etiqueta QR impermeável impressa na hora.',
  },
  {
    title: 'Colete dentro de 24h',
    text: 'A agenda mostra as coletas do dia; bipar o QR confirma a coleta.',
  },
];

/**
 * Field home for socio_campo on web.
 * The real flow runs in the mobile app (camera, QR scan, Bluetooth printer); on
 * the web this page explains it instead of showing a misleading empty list
 * (plan §6.11 — "nenhuma tela mente").
 */
export function CampoPage() {
  return (
    <AppShell title="Campo" subtitle="Moldagem, etiquetas e coletas de corpos de prova.">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card title="Como funciona" icon={<ClipboardText size={18} />}>
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
            Câmera para a nota fiscal, leitor de QR e impressora térmica Bluetooth funcionam no
            aplicativo de campo.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
