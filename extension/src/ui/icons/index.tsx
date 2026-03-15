import pauseSvg from './pause.svg';
import playSvg from './play.svg';
import trashSvg from './trash.svg';
import closeSvg from './close.svg';

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
