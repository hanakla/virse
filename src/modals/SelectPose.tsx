import { ModalProps } from "@fleur/mordred/dist/react-bind";
import { ChangeEvent, useState } from "react";
import { Button } from "../components/Button";
import { ModalBase } from "../components/ModalBase";
import { VirsePose } from "../domains/editor";
import { useFunc } from "../utils/hooks";

export function SelectPose({
  poses,
  onClose,
}: ModalProps<
  { poses: VirsePose[] },
  { poses: VirsePose[]; clearPoseSet: boolean } | null
>) {
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
      header="ポーズセットのインポート"
      content={
        <div
          css={`
            display: flex;
            flex-flow: column;
            gap: 8px;
          `}
        >
          <select
            css={`
              width: 100%;
              height: 400px;
            `}
            multiple
            value={selection}
            onChange={onChange}
          >
            {poses.map((pose) => (
              <option key={pose.uid} value={pose.uid}>
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
            現在のポーズセットを削除する
          </label>

          <Button
            onClick={() => {
              setSelection([...poses.map((p) => p.uid)]);
            }}
          >
            すべて選択
          </Button>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={handleOk}>
            OK
          </Button>
          <Button kind="default" onClick={() => onClose(null)}>
            キャンセル
          </Button>
        </>
      }
    />
  );
}
