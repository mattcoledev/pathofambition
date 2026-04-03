import type { NextConfig } from 'next';
import path from 'path';
import fs from 'fs';

// Symlink icons into public at build time if not already there
const publicIconsPath = path.join(process.cwd(), 'public', 'icons');
const iconsSourcePath = path.join(process.cwd(), 'icons');

if (!fs.existsSync(publicIconsPath) && fs.existsSync(iconsSourcePath)) {
  try {
    fs.symlinkSync(iconsSourcePath, publicIconsPath, 'junction');
  } catch {
    // ignore if already exists or permissions issue
  }
}

const nextConfig: NextConfig = {
  // Allow serving icons from project root via public symlink
};

export default nextConfig;
