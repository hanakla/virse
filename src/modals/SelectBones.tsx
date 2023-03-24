import { ModalProps } from '@fleur/mordred/dist/react-bind';
import escapeStringRegexp from 'escape-string-regexp';
import { ChangeEvent, useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ModalBase } from '../components/ModalBase';
import { useTranslation } from '../hooks/useTranslation';
import { useFunc } from '../utils/hooks';

export function SelectBones({
  boneNames,
  onClose,
}: ModalProps<{ boneNames: string[] }, string[] | null>) {
  const t = useTranslation('common');

  const [selection, setSelection] = useState<string[]>([]);
  const [filtered, setFiltered] = useState(boneNames);

  const onChange = useFunc(
    ({ currentTarget, nativeEvent }: ChangeEvent<HTMLSelectElement>) => {
      const next = Array.from(
        currentTarget.selectedOptions,
        ({ value }) => value
      );
      setSelection(next);
    }
  );

  const handleChangeFilter = useFunc(
    ({ currentTarget }: ChangeEvent<HTMLInputElement>) => {
      const matcher = new RegExp(escapeStringRegexp(currentTarget.value), 'i');
      setFiltered(boneNames.filter((boneName) => matcher.test(boneName)));
    }
  );

  return (
    <ModalBase
      onClose={onClose}
      content={
        <div
          css={`
            display: flex;
            flex-flow: column;
            gap: 8px;
          `}
        >
          <div>
            <Input
              placeholder={t('filter')}
              defaultValue=""
              onChange={handleChangeFilter}
            />
          </div>
          <select
            css={`
              width: 100%;
              height: 400px;
            `}
            multiple
            value={selection}
            onChange={onChange}
          >
            {filtered.map((boneName) => (
              <option key={boneName} value={boneName}>
                {boneName}
              </option>
            ))}
          </select>

          <Button
            onClick={() => {
              setSelection([...filtered]);
            }}
          >
            {t('selectAll')}
          </Button>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={() => onClose(selection)}>
            {t('ok')}
          </Button>
          <Button kind="default" onClick={() => onClose(null)}>
            {t('cancel')}
          </Button>
        </>
      }
    />
  );
}
