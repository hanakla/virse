import { RefObject, useRef } from 'react';
import { VirseStage, CamModes } from './VirseStage';
import { useIsomorphicLayoutEffect, useUpdate } from 'react-use';

export const useVirseStage = (canvas: RefObject<HTMLCanvasElement | null>) => {
  const rerender = useUpdate();
  const stage = useRef<VirseStage | null>(null);

  useIsomorphicLayoutEffect(() => {
    const { current } = stage;
    if (!current) return;

    const onUpdated = () => {
      rerender();
    };

    current.events.on('updated', onUpdated);
    return () => current.events.off('updated', onUpdated);
  }, [stage.current]);

  useIsomorphicLayoutEffect(() => {
    // return;
    const s =
      ((window as any)._stage =
      stage.current =
        new VirseStage(canvas.current!));

    let animId = 0;
    animId = requestAnimationFrame(function update() {
      s.render();
      animId = requestAnimationFrame(update);
    });

    return () => {
      cancelAnimationFrame(animId);
      s.dispose();
      stage.current = null;
    };
  }, []);

  return stage.current;
};
