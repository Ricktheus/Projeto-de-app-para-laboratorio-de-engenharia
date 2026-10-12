import { createElement, type SVGProps } from 'react';

import { ICON_DATA } from './icon-data';

export type IconWeight = 'regular' | 'bold' | 'fill';
export type IconName = keyof typeof ICON_DATA;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'ref' | 'name'> {
  size?: number | string;
  weight?: IconWeight;
}

/**
 * Renders one icon of the local Phosphor subset (same API as
 * `@phosphor-icons/react`: `size`, `weight`, `className`; colour =
 * `currentColor`). Decorative by default (`aria-hidden`).
 */
export function Icon({
  name,
  size = '1em',
  weight = 'regular',
  ...rest
}: IconProps & { name: IconName }) {
  const nodes = ICON_DATA[name][weight] as unknown as [string, Record<string, unknown>][];
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="currentColor"
      aria-hidden={rest['aria-label'] ? undefined : true}
      {...rest}
    >
      {nodes.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  );
}

function make(name: IconName) {
  function NamedIcon(props: IconProps) {
    return <Icon name={name} {...props} />;
  }
  NamedIcon.displayName = name;
  return NamedIcon;
}

export const ArrowRight = make('ArrowRight');
export const ArrowsClockwise = make('ArrowsClockwise');
export const Briefcase = make('Briefcase');
export const Buildings = make('Buildings');
export const CalendarBlank = make('CalendarBlank');
export const CalendarCheck = make('CalendarCheck');
export const ChartBar = make('ChartBar');
export const ChartLineUp = make('ChartLineUp');
export const CheckCircle = make('CheckCircle');
export const ClipboardText = make('ClipboardText');
export const Clock = make('Clock');
export const Cylinder = make('Cylinder');
export const DeviceMobile = make('DeviceMobile');
export const DownloadSimple = make('DownloadSimple');
export const FilePdf = make('FilePdf');
export const FileText = make('FileText');
export const Flask = make('Flask');
export const Gauge = make('Gauge');
export const Hammer = make('Hammer');
export const Info = make('Info');
export const List = make('List');
export const MagnifyingGlass = make('MagnifyingGlass');
export const MicrosoftExcelLogo = make('MicrosoftExcelLogo');
export const PenNib = make('PenNib');
export const PencilSimple = make('PencilSimple');
export const Plus = make('Plus');
export const QrCode = make('QrCode');
export const Scales = make('Scales');
export const SealCheck = make('SealCheck');
export const SignOut = make('SignOut');
export const Stack = make('Stack');
export const Timer = make('Timer');
export const Truck = make('Truck');
export const UsersThree = make('UsersThree');
export const WarningCircle = make('WarningCircle');
export const X = make('X');
export const XCircle = make('XCircle');
