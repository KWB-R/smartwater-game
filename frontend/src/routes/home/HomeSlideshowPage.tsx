import { useCallback, useEffect } from "react";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchHomepage } from "@/api/services/homepageService";
import { HomeSlideshow } from "@/components/features/home/HomeSlideshow";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import {
  parseSlideshowSlideParam,
  slideshowSlidePath,
} from "@/routes/home/params/slideshowSlideParam";
import { ROUTES } from "@/routes/paths";

export function HomeSlideshowPage() {
  const homepageResource = useAsyncResource(fetchHomepage, []);
  const navigate = useNavigate();
  const location = useLocation();
  const { slideIndex: slideIndexParam } = useParams();

  useReloadOnOnline(homepageResource.reload);

  const completeIntro = useCallback(() => {
    navigate(ROUTES.map, { replace: true });
  }, [navigate]);

  const slides =
    homepageResource.status === "success" ? homepageResource.data.slides : [];
  const activeIndex = parseSlideshowSlideParam(slideIndexParam, slides.length);
  const canonicalPath = slides.length > 0 ? slideshowSlidePath(activeIndex) : null;

  useEffect(() => {
    if (canonicalPath == null || location.pathname === canonicalPath) {
      return;
    }
    navigate(canonicalPath, { replace: true });
  }, [canonicalPath, location.pathname, navigate]);

  const onActiveIndexChange = useCallback(
    (index: number) => {
      navigate(slideshowSlidePath(index), { replace: true });
    },
    [navigate],
  );

  if (homepageResource.status === "loading" || homepageResource.status === "idle") {
    return (
      <FullscreenLoadingScreen />
    );
  }

  if (homepageResource.status === "error") {
    return <Navigate to={ROUTES.map} replace />;
  }

  if (homepageResource.data.slides.length === 0) {
    return <Navigate to={ROUTES.map} replace />;
  }

  return (
    <HomeSlideshow
      slides={homepageResource.data.slides}
      activeIndex={activeIndex}
      onActiveIndexChange={onActiveIndexChange}
      onComplete={completeIntro}
    />
  );
}
