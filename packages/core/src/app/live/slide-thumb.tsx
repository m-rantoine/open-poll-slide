import { SlideCanvas } from '../components/slide-canvas';
import { SlidePageProvider } from '../lib/page-context';
import { CANVAS_WIDTH } from '../lib/sdk';
import { useSlideModule } from '../lib/use-slide-module';

export function SlideThumb({ slideId, width = 64 }: { slideId: string; width?: number }) {
  const { slide } = useSlideModule(slideId);
  const Page = slide?.default[0];
  const height = Math.round((width * 9) / 16);
  return (
    <div
      aria-hidden
      className="shrink-0 overflow-hidden rounded-[4px] bg-muted ring-1 ring-foreground/10"
      style={{ width, height }}
    >
      {Page && (
        <SlideCanvas
          flat
          freezeMotion
          center={false}
          scale={width / CANVAS_WIDTH}
          design={slide.design}
        >
          <SlidePageProvider index={0} total={slide.default.length}>
            <Page />
          </SlidePageProvider>
        </SlideCanvas>
      )}
    </div>
  );
}
