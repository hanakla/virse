import { useEffect, useRef } from "react";

export const RealDom = ({
  element,
  className,
}: {
  element: HTMLElement | null;
  className?: string;
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!element) return;
    ref.current?.replaceChildren(element);
  }, [element]);

  return <div ref={ref} className={className} />;
};
