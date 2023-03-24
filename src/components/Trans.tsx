import { TransProps } from 'next-translate';
import NextTrans from 'next-translate/Trans';
import type * as commonKeys from '../../locales/ja/common.json';

type Props = Omit<TransProps, 'i18nKey'> & { i18nKey: keyof typeof commonKeys };

export function Trans(props: Props) {
  return (
    <NextTrans
      ns="common"
      {...props}
      components={{
        br: <br />,
        ...props.components,
      }}
    />
  );
}
