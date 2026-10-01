type QuizCorrectArrowIconProps = {
  className?: string;
};

export function QuizCorrectArrowIcon({
  className = "block h-[2rem] w-auto max-w-[1.85rem]",
}: QuizCorrectArrowIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 29 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M23.2542 1.79275C23.9214 0.276285 25.6918 -0.412443 27.2083 0.254666C28.7247 0.921912 29.4135 2.69228 28.7464 4.20877L16.3079 32.4783L1.33621 22.4969C-0.0423809 21.5778 -0.414883 19.7153 0.504174 18.3367C1.42323 16.9581 3.28574 16.5856 4.66433 17.5047L13.6917 23.5232L23.2542 1.79275Z"
        fill="var(--color-swg-purple)"
      />
    </svg>
  );
}
