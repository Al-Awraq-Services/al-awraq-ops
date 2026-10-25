import Image from "next/image";

// Bounding box of the airflow mark (red bracket + blue arrows) inside the
// 340×300 public/logo.jpg, measured by eye — the wordmark below it is
// unreadable at header sizes, so small placements crop to the mark only.
const LOGO = { width: 340, height: 300 };
const MARK = { x: 88, y: 28, width: 180, height: 122 };

/**
 * The logo's airflow mark at a given pixel height, cropped out of the full
 * logo file. `mix-blend-multiply` drops the JPEG's white background onto
 * the paper canvas.
 */
export function BrandMark({ height = 24, className = "" }: { height?: number; className?: string }) {
  const scale = height / MARK.height;
  return (
    <span
      aria-hidden="true"
      className={`relative inline-block shrink-0 overflow-hidden ${className}`}
      style={{ width: MARK.width * scale, height }}
    >
      <Image
        src="/logo.jpg"
        alt=""
        width={Math.round(LOGO.width * scale)}
        height={Math.round(LOGO.height * scale)}
        className="absolute max-w-none mix-blend-multiply"
        style={{
          width: LOGO.width * scale,
          height: LOGO.height * scale,
          left: -MARK.x * scale,
          top: -MARK.y * scale,
        }}
        priority
      />
    </span>
  );
}
