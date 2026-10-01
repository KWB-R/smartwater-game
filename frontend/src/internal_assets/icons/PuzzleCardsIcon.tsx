import puzzleCardsIconUrl from "./PuzzleCards.svg";

type Props = {
  className?: string;
};

export function PuzzleCardsIcon({ className }: Props) {
  return (
    <img
      src={puzzleCardsIconUrl}
      alt=""
      aria-hidden
      className={className}
      width={54}
      height={52}
      draggable={false}
    />
  );
}
