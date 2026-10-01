type ArrowIconProps = {
  className?: string;
};

export function ArrowIcon({ className = "block size-7 shrink-0" }: ArrowIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M114.791 356.211C109.238 361.781 100.234 361.779 94.6797 356.211L4.1656 265.401C-1.3885 259.829 -1.3885 250.797 4.1656 245.225L94.6797 154.416C100.234 148.847 109.238 148.845 114.791 154.416C120.344 159.986 120.341 169.02 114.791 174.592L48.5546 241.044L512 241.044L512 269.582L48.5546 269.582L114.791 336.034C120.341 341.607 120.344 350.64 114.791 356.211Z"
        fill="currentColor"
      />
    </svg>
  );
}
