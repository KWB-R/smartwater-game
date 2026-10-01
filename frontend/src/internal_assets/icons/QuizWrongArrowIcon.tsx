type QuizWrongArrowIconProps = {
  className?: string;
};

export function QuizWrongArrowIcon({
  className = "block h-[2rem] w-auto max-w-[1.85rem]",
}: QuizWrongArrowIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M22.1534 1.1309C23.1855 -0.164958 25.0732 -0.378658 26.3692 0.653361C27.665 1.68551 27.8787 3.57316 26.8467 4.86918L17.585 16.5L26.8467 28.1309C27.8787 29.4269 27.665 31.3146 26.3692 32.3467C25.0732 33.3787 23.1855 33.165 22.1534 31.8692L13.75 21.3155L5.34672 31.8692C4.31457 33.165 2.42692 33.3787 1.1309 32.3467C-0.164958 31.3146 -0.378658 29.4269 0.653361 28.1309L9.9141 16.5L0.653361 4.86918C-0.378658 3.57316 -0.164958 1.68551 1.1309 0.653361C2.42692 -0.378658 4.31457 -0.164958 5.34672 1.1309L13.75 11.6836L22.1534 1.1309Z"
        fill="var(--color-swg-purple)"
      />
    </svg>
  );
}
