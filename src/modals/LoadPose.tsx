import { ModalProps } from '@fleur/mordred';
import { ChangeEvent, useState } from 'react';
import { Button } from '../components/Button';
import { ModalBase } from '../components/ModalBase';
import { VirsePose } from '../domains/editor';
import { useTranslation } from '../hooks/useTranslation';
import { useFunc } from '../utils/hooks';

export function LoadPose({
  poses,
  onClose,
}: ModalProps<
  { poses: VirsePose[] },
  { poses: VirsePose[]; clearPoseSet: boolean } | null
>) {
  const t = useTranslation('common');

  const [clearPoseSet, setClearPoseSet] = useState(false);
  const [selection, setSelection] = useState<string[]>([]);

  const onChange = useFunc(
    ({ currentTarget }: ChangeEvent<HTMLSelectElement>) => {
      const next = Array.from(
        currentTarget.selectedOptions,
        ({ value }) => value
      );
      setSelection(next);
    }
  );
  const handleOk = useFunc(() => {
    onClose({
      poses: poses.filter((pose) => selection.includes(pose.uid)),
      clearPoseSet,
    });
  });

  return (
    <ModalBase
      onClose={onClose}
      header={<h1>{t('loadPose/title')}</h1>}
      content={
        <div
          css={`
            display: flex;
            flex-flow: column;
            gap: 8px;
          `}
        >
          <select
            className="w-full h-[400px] border border-gray-400"
            multiple
            value={selection}
            onChange={onChange}
          >
            {poses.map((pose) => (
              <option key={pose.uid} className="py-[2px]" value={pose.uid}>
                {pose.name}
              </option>
            ))}
          </select>

          <label>
            <input
              type="checkbox"
              checked={clearPoseSet}
              onChange={({ currentTarget }) =>
                setClearPoseSet(currentTarget.checked)
              }
            />
            {t('loadPose/deleteCurrentPoset')}
          </label>

          <Button
            onClick={() => {
              setSelection([...poses.map((p) => p.uid)]);
            }}
          >
            {t('selectAll')}
          </Button>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={handleOk}>
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
