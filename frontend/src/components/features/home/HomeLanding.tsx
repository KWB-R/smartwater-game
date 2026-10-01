import type { RichTextBlocks } from "@/domain/richText";
import { StrapiBlocksView } from "@/components/features/strapi/StrapiBlocksView";
import { Button } from "@/components/ui/Button";
import "./HomeLanding.scss";

type Props = {
  content: RichTextBlocks | null;
  onContinue: () => void;
};

export function HomeLanding({ content, onContinue }: Props) {
  return (
    <section className="home-landing" aria-label="Startseite">
      <div className="home-landing__scroll">
        <div className="home-landing__content">
          <StrapiBlocksView
            blocks={content}
            className="strapi-blocks-view--align-center"
            emptyLabel=""
          />
        </div>
      </div>
      <footer className="home-landing__footer">
        <div className="flex items-center gap-3 px-4 py-[0.85rem]">
          <Button grow className="home-landing__continue" onClick={onContinue}>
            Los geht's!
          </Button>
        </div>
      </footer>
    </section>
  );
}
