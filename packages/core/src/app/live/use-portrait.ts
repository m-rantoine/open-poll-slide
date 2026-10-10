import { useMediaQuery } from '../lib/use-media-query';

// Width at most 0.75x the height (inclusive). The viewport shape decides the layout, not its width,
// so a tall tablet gets the stacked layout and a wide phone in landscape does not.
const QUERY = '(max-aspect-ratio: 3/4)';

export function usePortrait(): boolean {
  return useMediaQuery(QUERY);
}
