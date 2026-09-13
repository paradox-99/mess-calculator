// The site mark: a steaming bowl on the brand teal. Keep in sync with
// src/app/icon.svg, which is the same drawing served as the favicon.
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#176a7d" />
          <stop offset="1" stopColor="#0a3b48" />
        </linearGradient>
        <linearGradient id="logo-bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f2c14e" />
          <stop offset="1" stopColor="#d9aa2f" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#logo-bg)" />
      <g
        fill="none"
        stroke="#fffdf7"
        strokeWidth="3"
        strokeLinecap="round"
        opacity=".85"
      >
        <path d="M23 28c-2.5-2.5-2.5-5 0-7.5s2.5-5 0-7.5" />
        <path d="M32 28c-3-3-3-6 0-9s3-6 0-9" />
        <path d="M41 28c-2.5-2.5-2.5-5 0-7.5s2.5-5 0-7.5" />
      </g>
      <path d="M14 34h36a18 14 0 0 1-36 0z" fill="url(#logo-bowl)" />
      <path
        d="M18 40a16 10 0 0 0 10 7c-5-1-9-3-10-7z"
        fill="#0a3b48"
        opacity=".18"
      />
      <ellipse cx="32" cy="34" rx="18" ry="3.5" fill="#fbe08a" />
      <ellipse cx="32" cy="34" rx="14" ry="2" fill="#0f4c5c" opacity=".35" />
      <rect x="25" y="48" width="14" height="4.5" rx="2.25" fill="#e76f51" />
    </svg>
  );
}
