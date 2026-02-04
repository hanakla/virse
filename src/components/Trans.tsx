import { useTranslations } from 'next-intl';
import { type ReactNode } from 'react';
import type * as commonKeys from '../../locales/ja.json';

type Props = {
  i18nKey: keyof typeof commonKeys;
  values?: Record<string, any>;
  components?: Record<string, (chunks: ReactNode) => ReactNode>;
};

export function Trans({ i18nKey, values, components }: Props) {
  const t = useTranslations();

  const defaultComponents = {
    br: () => <br />,
    ...components,
  };

  return <>{t.rich(i18nKey, { ...values, ...defaultComponents })}</>;
}
