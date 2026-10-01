import type { LevelBonusCategoryId } from "@/domain/levelBonusCategories";
import { strapiImgCrossOrigin } from "@/api/strapiMediaImg";

type MissionBonusProps = {
  type: LevelBonusCategoryId;
  name: string;
  imageUrl: string | null;
  imageAlt: string;
};

export function MissionBonus({
  type,
  name,
  imageUrl,
  imageAlt,
}: MissionBonusProps) {
  return (
    <li
      className="flex w-full min-w-0 flex-col items-center gap-2 rounded-2xl border border-swg-black/10 bg-white px-2 py-2.5 shadow-[0_4px_14px_rgb(55_81_114/0.12)]"
      data-mission-type={type}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={imageAlt}
          className="size-15 shrink-0 rounded-full object-cover"
          decoding="async"
          crossOrigin={strapiImgCrossOrigin(imageUrl)}
        />
      ) : (
        <div
          className="size-15 shrink-0 rounded-full bg-[rgb(55_81_114/0.12)]"
          aria-hidden
        />
      )}
      <span className="text-center font-text text-sm leading-tight text-swg-black">
        {name}
      </span>
    </li>
  );
}
