import useT from 'next-translate/useTranslation';
import type * as commonKeys from '../../locales/ja/common.json';

type Keys = keyof typeof commonKeys;

export function useTranslation(ns?: string) {
  const { t } = useT(ns);

  return t as (
    key: Keys,
    query?: Record<string, any> | null,
    options?: {
      fallback?: string | string[];
    }
  ) => string;
}
