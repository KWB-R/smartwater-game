type ChevronDownIconProps = {
  className?: string;
};

export function ChevronDownIcon({
  className = "block h-[0.8125rem] w-[1.375rem] shrink-0",
}: ChevronDownIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 22 13"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M20.4746 1L10.7373 10.7373L0.999999 1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
