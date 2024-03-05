import { StoreClass } from '@fleur/fleur';
import { ExtractStateOfStoreClass } from '@fleur/fleur/dist/Store';
import { useStore } from '@fleur/react';
import mousetrap from 'mousetrap';
import {
  MutableRefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { shallowEquals } from './object';
import { useObjectState } from '@hanakla/arma';

export const useFunc = <T extends (...args: any[]) => any>(fn: T): T => {
  const stableRef = useRef<T>(fn);

  useBrowserEffect(() => {
    stableRef.current = fn;
  }, [fn]);

  return useCallback<any>((...args: any[]) => stableRef.current!(...args), []);
};

const useBrowserEffect =
  typeof window !== 'undefined' ? useLayoutEffect : () => {};

export const useStableLatestRef = <T>(value: T) => {
  const stableRef = useRef<T>(value);

  useBrowserEffect(() => {
    stableRef.current = value;
  }, [value]);

  return stableRef;
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
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/** useState, but update state on original value changed */
export const useBufferedState = <T, S = T>(
  original: T | (() => T),
  transform?: (value: T) => S
): [S, (value: S | ((prevState: S) => S)) => S] => {
  const originalValue =
    typeof original === 'function' ? (original as any)() : original;
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

type MousetrapCallback = (
  e: mousetrap.ExtendedKeyboardEvent,
  combo: string
) => void;

export const useMousetrap = (
  handlerKey: string,
  handlerCallback: MousetrapCallback,
  evtType = undefined
) => {
  const handlerRef = useStableLatestRef(handlerCallback);

  useEffect(() => {
    mousetrap.bind(
      handlerKey,
      (...args) => handlerRef.current(...args),
      evtType
    );

    return () => {
      mousetrap.unbind(handlerKey);
    };
  }, [handlerKey]);
};

export const useBindMousetrap = (
  ref: MutableRefObject<HTMLElement | null>,
  handlerKey: string | string[],
  handlerCallback: MousetrapCallback,
  {
    enableOnInput = false,
    evtType = undefined,
  }: { enableOnInput?: boolean; evtType?: string } = {}
) => {
  const handlerRef = useStableLatestRef(handlerCallback);

  useEffect(() => {
    if (!ref.current) return;

    const trap = mousetrap(ref.current);

    trap.bind(
      handlerKey,
      (e, combo) => {
        if (
          !enableOnInput &&
          (e.target as HTMLElement).matches('input, textarea, select')
        ) {
          return;
        }

        handlerRef.current(e, combo);
      },
      evtType
    );

    return () => {
      trap.reset();
    };
  }, [ref.current, handlerKey]);
};

export const useObjectStateWithRef = <T extends object>(
  initialState: T
): [
  T,
  (patch: Partial<T> | ((draft: T) => void)) => void,
  MutableRefObject<T>
] => {
  const [state, setState] = useObjectState<T>(initialState);
  const ref = useStableLatestRef(state);

  return [state, setState as any, ref];
};

export const useFocusRestore = () => {
  const prevFocusElementRef = useRef<HTMLElement | null>(
    typeof document !== 'undefined'
      ? (document.activeElement as HTMLElement)
      : null
  );

  useLayoutEffect(() => {
    const restoreFocusTarget = prevFocusElementRef.current;

    return () => {
      setTimeout(() => {
        restoreFocusTarget?.focus();
      });
    };
  }, []);
};
