import { StoreClass } from "@fleur/fleur";
import { ExtractStateOfStoreClass } from "@fleur/fleur/dist/Store";
import { useStore } from "@fleur/react";
import mousetrap from "mousetrap";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { shallowEquals } from "./object";

export const useFunc = <T extends (...args: any[]) => any>(fn: T): T => {
  const ref = useRef<T | null>(null);
  ref.current = fn;

  return useCallback<any>((...args: any[]) => ref.current!(...args), []);
};

export const useStoreState = <T>(
  selector: (
    get: <S extends StoreClass>(store: S) => ExtractStateOfStoreClass<S>
  ) => T
): T => {
  return useStore((get) => {
    const getter = <S extends StoreClass>(store: S) =>
      get(store).state as ExtractStateOfStoreClass<S>;

    return selector(getter);
  });
};

export const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** useState, but update state on original value changed */
export const useBufferedState = <T, S = T>(
  original: T | (() => T),
  transform?: (value: T) => S
): [S, (value: S | ((prevState: S) => S)) => S] => {
  const originalValue =
    typeof original === "function" ? (original as any)() : original;
  const [state, setState] = useState<S | T>(
    () => transform?.(originalValue) ?? originalValue
  );
  const prevOriginal = useRef(originalValue);

  useIsomorphicLayoutEffect(() => {
    if (
      prevOriginal.current === originalValue ||
      shallowEquals(prevOriginal.current, originalValue)
    )
      return;

    prevOriginal.current = originalValue;
    setState(transform?.(originalValue) ?? originalValue);
  }, [originalValue]);

  return [state as T, setState] as any;
};

export const useMousetrap = (
  handlerKey: string,
  handlerCallback: () => void,
  evtType = undefined
) => {
  let actionRef = useRef<(() => void) | null>(null);
  actionRef.current = handlerCallback;

  useEffect(() => {
    mousetrap.bind(
      handlerKey,
      (evt, combo) => {
        typeof actionRef.current === "function" &&
          actionRef.current(evt, combo);
      },
      evtType
    );
    return () => {
      mousetrap.unbind(handlerKey);
    };
  }, [handlerKey]);
};
