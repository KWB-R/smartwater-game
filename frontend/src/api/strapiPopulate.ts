const STRAPI_LEVEL_MASKOTTCHEN_FIELDS =
  "populate[maskottchen][populate][happy]=true" +
  "&populate[maskottchen][populate][superhappy]=true" +
  "&populate[maskottchen][populate][unhappy]=true";

const STRAPI_LEVEL_END_ANIMATION_POPULATE =
  "populate[puzzleItems][on][object.end-animation]=true";

const STRAPI_LEVEL_PUZZLE_POPULATE =
  "populate[puzzleItems][on][object.puzzle-item][populate][punkte]=true" +
  `&${STRAPI_LEVEL_END_ANIMATION_POPULATE}`;

/** Lädt die Level-Beziehung einschließlich der Maskottchen-Medien aus object.maskottchen. */
export const STRAPI_LEVEL_MASKOTTCHEN_POPULATE =
  "populate[levels][populate][maskottchen][populate][happy]=true" +
  "&populate[levels][populate][maskottchen][populate][superhappy]=true" +
  "&populate[levels][populate][maskottchen][populate][unhappy]=true" +
  "&populate[levels][populate][mapMarkerPosition]=true" +
  "&populate[namensOffset]=true" +
  "&populate[levels][populate][mission][populate]=image" +
  "&populate[levels][populate][puzzleItems][on][object.puzzle-item][populate][punkte]=true" +
  "&populate[levels][populate][puzzleItems][on][object.end-animation]=true" +
  "&populate[levels][populate][quiz][populate][answers]=true";

/** Beim einzelnen Level die Dynamic Zone ausdrücklich über populate laden. */
const STRAPI_LEVEL_QUIZ_POPULATE =
  "populate[quiz][populate][answers]=true";

export const STRAPI_LEVEL_DETAIL_POPULATE =
  `${STRAPI_LEVEL_MASKOTTCHEN_FIELDS}&populate[mapMarkerPosition]=true&populate[mission][populate]=image&${STRAPI_LEVEL_PUZZLE_POPULATE}&${STRAPI_LEVEL_QUIZ_POPULATE}`;
