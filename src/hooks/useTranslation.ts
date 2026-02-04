import { useTranslations } from 'next-intl';
import type * as commonKeys from '../../locales/ja.json';

type Keys = keyof typeof commonKeys;

export function useTranslation(_ns?: string) {
  const t = useTranslations();

  return (
    key: Keys,
    values?: Record<string, any>
  ) => t(key, values);
}
