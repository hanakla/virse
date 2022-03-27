import { useCallback, useState } from "react";

type ArrayElement<T> = T extends Array<infer R> ? R : never;

export const useTab = <T extends string[]>(
  values: T,
  defaultTab: ArrayElement<T>
) => {
  const [active, setActive] = useState<ArrayElement<T>>(defaultTab);
  const set = useCallback((next: ArrayElement<T>) => {
    if (!values.includes(next)) throw new Error("invalid tab");
    setActive(next);
  }, []);

  return [active, set];
};
