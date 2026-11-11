import Image from 'next/image';

interface BrandMarkProps {
  size?: 16 | 24 | 32 | 36 | 40 | 48 | 144;
}

// The surrounding link or adjacent application name supplies the accessible name.
export function BrandMark({ size = 32 }: BrandMarkProps) {
  return (
    <Image
      src="/brand/journal-v3.png"
      alt=""
      width={size}
      height={size}
      unoptimized
      className="shrink-0 rounded-md"
    />
  );
}
