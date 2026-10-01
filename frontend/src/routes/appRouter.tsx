import { lazy } from "react";
import type { RouteObject } from "react-router-dom";
import { createBrowserRouter } from "react-router-dom";
import { AppRouteError } from "@/components/errors/AppRouteError";
import { AppViewportRoot } from "@/components/layout/AppViewport";
import { DefaultLayout } from "@/components/layout/DefaultLayout";
import { ROUTES, RECHTLICHES_ROUTE_HANDLE, RECHTLICHES_ROUTE_PATTERN } from "@/routes/paths";

const HomePage = lazy(() =>
  import("@/routes/home/HomePage").then((m) => ({ default: m.HomePage })),
);
const HomeSlideshowPage = lazy(() =>
  import("@/routes/home/HomeSlideshowPage").then((m) => ({
    default: m.HomeSlideshowPage,
  })),
);
const MapPage = lazy(() =>
  import("@/routes/map/MapPage").then((m) => ({ default: m.MapPage })),
);
const LevelSessionShell = lazy(() =>
  import("@/components/features/level/session/LevelSessionShell").then((m) => ({
    default: m.LevelSessionShell,
  })),
);
const LevelPlayRouter = lazy(() => import("@/routes/level/LevelPlayRouter"));
const ProjektpartnerPage = lazy(() =>
  import("@/routes/projektpartner/ProjektpartnerPage").then((m) => ({
    default: m.ProjektpartnerPage,
  })),
);
const RechtlichesPage = lazy(() =>
  import("@/routes/rechtliches/RechtlichesPage").then((m) => ({
    default: m.RechtlichesPage,
  })),
);
const NotFoundPage = lazy(() =>
  import("@/routes/notFound/NotFoundPage").then((m) => ({
    default: m.NotFoundPage,
  })),
);
const AnalyticsPage = lazy(() =>
  import("@/routes/analytics/AnalyticsPage").then((m) => ({
    default: m.AnalyticsPage,
  })),
);

const levelChildren: RouteObject[] = [
  { index: true, element: <LevelPlayRouter /> },
  { path: ":phase", element: <LevelPlayRouter /> },
];

const layoutChildren: RouteObject[] = [
  {
    index: true,
    element: <HomePage />,
  },
  {
    path: `${ROUTES.slideshow}/:slideIndex?`,
    element: <HomeSlideshowPage />,
  },
  {
    path: `${ROUTES.map}/:districtId/detail/:levelKey?`,
    element: <MapPage />,
  },
  {
    path: `${ROUTES.gallerie}/:levelKey?`,
    element: <MapPage />,
  },
  {
    path: `${ROUTES.map}/:districtId?`,
    element: <MapPage />,
  },
  {
    path: `${ROUTES.level}/:levelId`,
    element: <LevelSessionShell />,
    children: levelChildren,
  },
  {
    path: ROUTES.projektpartner,
    element: <ProjektpartnerPage />,
  },
  {
    path: RECHTLICHES_ROUTE_PATTERN,
    element: <RechtlichesPage />,
    handle: RECHTLICHES_ROUTE_HANDLE,
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
];

if (import.meta.env.DEV) {
  const LichtenbergLayoutDebugPage = lazy(() =>
    import("@/routes/debug/LichtenbergLayoutDebugPage").then((m) => ({
      default: m.LichtenbergLayoutDebugPage,
    })),
  );
  layoutChildren.push({
    path: ROUTES.debugLichtenbergLayout,
    element: <LichtenbergLayoutDebugPage />,
  });
}

export const appRouter = createBrowserRouter([
  {
    element: <AppViewportRoot />,
    errorElement: <AppRouteError />,
    children: [
      {
        path: ROUTES.analytics,
        element: <AnalyticsPage />,
        errorElement: <AppRouteError />,
      },
      {
        element: <DefaultLayout />,
        errorElement: <AppRouteError />,
        children: layoutChildren,
      },
    ],
  },
]);
