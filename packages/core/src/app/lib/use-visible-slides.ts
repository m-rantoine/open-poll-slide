import { useMemo } from 'react';
import { useCanSeePrivateSlides } from '../live/auth';
import { isSlidePrivate, slideIds } from './slides';

/** The decks this visitor may browse: everything for hosts, only public decks for anyone else. */
export function useVisibleSlideIds(): string[] {
  const canSeePrivate = useCanSeePrivateSlides();
  return useMemo(
    () => (canSeePrivate ? slideIds : slideIds.filter((id) => !isSlidePrivate(id))),
    [canSeePrivate],
  );
}
