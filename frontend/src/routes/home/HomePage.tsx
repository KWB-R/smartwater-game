import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchHomepage } from "@/api/services/homepageService";
import { HomeLanding } from "@/components/features/home/HomeLanding";
import { warmHomepageSlideshowSlides } from "@/features/home/homeSlideshowWarmup";
import { FullscreenLoadingScreen } from "@/components/ui/FullscreenLoadingScreen";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useReloadOnOnline } from "@/hooks/useOfflineStatus";
import { ROUTES } from "@/routes/paths";

export function HomePage() {
  const homepageResource = useAsyncResource(fetchHomepage, []);
  const navigate = useNavigate();

  useReloadOnOnline(homepageResource.reload);

  useEffect(() => {
    if (homepageResource.status === "success" && homepageResource.data.slides.length > 0) {
      warmHomepageSlideshowSlides(homepageResource.data.slides);
    }
  }, [homepageResource]);

  const continueFromLanding = useCallback(() => {
    if (
      homepageResource.status === "success" &&
      homepageResource.data.slides.length === 0
    ) {
      navigate(ROUTES.map, { replace: true });
      return;
    }
    navigate(ROUTES.slideshowSlide(1));
  }, [homepageResource, navigate]);

  if (homepageResource.status === "loading" || homepageResource.status === "idle") {
    return (
      <FullscreenLoadingScreen />
    );
  }

  if (homepageResource.status === "error") {
    return (
      <HomeLanding content={null} onContinue={() => navigate(ROUTES.map, { replace: true })} />
    );
  }

  return (
    <HomeLanding
      content={homepageResource.data.content}
      onContinue={continueFromLanding}
    />
  );
}
