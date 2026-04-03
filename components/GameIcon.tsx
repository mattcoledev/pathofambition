import Image from 'next/image';
import fs from 'fs';
import path from 'path';

interface GameIconProps {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
  /** Use 'light' for dark icons on light background (default), 'dark' for white icons */
  mode?: 'light' | 'dark';
}

function findIconPath(name: string, mode: 'light' | 'dark'): string | null {
  const folder = mode === 'light' ? 'lightmode_game-icons.net.svg' : 'darkmode_game-icons.net.svg';
  const iconsDir = path.join(process.cwd(), 'icons', folder);
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  try {
    const authors = fs.readdirSync(iconsDir);
    for (const author of authors) {
      const authorDir = path.join(iconsDir, author);
      try {
        const stat = fs.statSync(authorDir);
        if (!stat.isDirectory()) continue;
        const files = fs.readdirSync(authorDir);
        const match = files.find(
          (f) => f.replace('.svg', '') === slug || f.replace('.svg', '').includes(slug)
        );
        if (match) {
          return `/icons/${folder}/${author}/${match}`;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export default function GameIcon({ name, size = 24, className = '', alt, mode = 'light' }: GameIconProps) {
  const iconPath = findIconPath(name, mode);
  if (!iconPath) return null;

  return (
    <Image
      src={iconPath}
      alt={alt ?? name}
      width={size}
      height={size}
      className={className}
      aria-hidden={!alt}
      style={{ display: 'inline-block' }}
    />
  );
}
