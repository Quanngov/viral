import Image from "next/image";
import Link from "next/link";

type ViralLogoProps = {
  className?: string;
  showWordmark?: boolean;
  variant?: "default" | "inverse";
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { icon: 28, word: "text-[0.9375rem]" },
  md: { icon: 32, word: "text-[1.0625rem]" },
  lg: { icon: 40, word: "text-[1.25rem]" },
};

export function ViralLogo({
  className = "",
  showWordmark = true,
  variant = "default",
  size = "md",
}: ViralLogoProps) {
  const dim = sizes[size];
  const wordColor = variant === "inverse" ? "text-white" : "text-[#0a0a0b]";

  return (
    <span className={`inline-flex items-center gap-2.5 leading-none ${className}`}>
      <Image
        src="/viral-logo.png"
        alt="ViralCloud"
        width={dim.icon}
        height={dim.icon}
        className="block shrink-0 rounded-[22%] shadow-sm"
        priority
      />
      {showWordmark ? (
        <span className={`${dim.word} block font-semibold leading-none tracking-[-0.03em] ${wordColor}`}>
          ViralCloud
        </span>
      ) : null}
    </span>
  );
}

export function ViralLogoLink({
  variant = "default",
  size = "md",
}: {
  variant?: "default" | "inverse";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Link
      href="/landing"
      className="inline-flex h-full items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#34d399]"
    >
      <ViralLogo variant={variant} size={size} />
    </Link>
  );
}
