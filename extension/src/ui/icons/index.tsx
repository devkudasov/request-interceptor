import pauseSvg from './pause.svg';
import playSvg from './play.svg';
import trashSvg from './trash.svg';
import closeSvg from './close.svg';
import shieldSvg from './shield.svg';
import globeSvg from './globe.svg';

interface IconProps {
  className?: string;
  size?: number;
}

export function PauseIcon({ className, size = 16 }: IconProps) {
  return <img src={pauseSvg} alt="" width={size} height={size} className={className} />;
}

export function PlayIcon({ className, size = 16 }: IconProps) {
  return <img src={playSvg} alt="" width={size} height={size} className={className} />;
}

export function TrashIcon({ className, size = 16 }: IconProps) {
  return <img src={trashSvg} alt="" width={size} height={size} className={className} />;
}

export function CloseIcon({ className, size = 16 }: IconProps) {
  return <img src={closeSvg} alt="" width={size} height={size} className={className} />;
}

export function ShieldIcon({ className, size = 14 }: IconProps) {
  return <img src={shieldSvg} alt="" width={size} height={size} className={className} />;
}

export function GlobeIcon({ className, size = 14 }: IconProps) {
  return <img src={globeSvg} alt="" width={size} height={size} className={className} />;
}

export enum RequestSource {
  Real = 'real',
  Mocked = 'mocked',
}
