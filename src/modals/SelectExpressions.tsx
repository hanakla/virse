import { ModalComponentType } from "@fleur/mordred";
import { ModalProps } from "@fleur/mordred/dist/react-bind";
import escapeStringRegexp from "escape-string-regexp";
import { ChangeEvent, useState } from "react";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { ModalBase } from "../components/ModalBase";
import { useFunc } from "../utils/hooks";

export function SelectExpressions({
  expressionNames,
  onClose,
}: ModalProps<{ expressionNames: string[] }, string[] | null>) {
  const [selection, setSelection] = useState<string[]>([]);
  const [filtered, setFiltered] = useState(expressionNames);

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
      const matcher = new RegExp(escapeStringRegexp(currentTarget.value), "i");
      setFiltered(expressionNames.filter((name) => matcher.test(name)));
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
              placeholder="フィルター"
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
            {filtered.map((expressionName) => (
              <option key={expressionName} value={expressionName}>
                {expressionName}
              </option>
            ))}
          </select>

          <Button
            onClick={() => {
              setSelection([...filtered]);
            }}
          >
            すべて選択
          </Button>
        </div>
      }
      footer={
        <>
          <Button kind="primary" onClick={() => onClose(selection)}>
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
