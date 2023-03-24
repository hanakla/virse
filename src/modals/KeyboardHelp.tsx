import { ModalProps } from '@fleur/mordred/dist/react-bind';
import { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { ModalBase } from '../components/ModalBase';
import { useFocusRestore } from '../utils/hooks';

export function KeyboardHelp({ onClose }: ModalProps<{}, string[] | null>) {
  useFocusRestore({ restoreOnUnmount: true });

  return (
    <ModalBase
      css={css`
        background-color: transparent;
      `}
      onClose={onClose}
      content={
        <div
          css={css`
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          `}
        >
          <Entry keyCode={'H'} desc={'キーボードヘルプを表示'} />
          <Entry
            keyCode={'R'}
            desc={
              <>
                IKボーン操作モードの切り替え
                <br />
                (移動・回転)
              </>
            }
          />
          <Entry keyCode={'B (Bone)'} desc={'ボーン表示切り替え'} />
          <Entry keyCode={'A'} desc={'兄弟ボーン選択'} />
          <Entry keyCode={'S'} desc={'親ボーン選択'} />
          <Entry keyCode={'D'} desc={'子ボーン選択'} />
          <Entry
            keyCode={"'"}
            desc={'ボーンコントロールの切り替え(移動・回転)'}
          />
        </div>
      }
      footer={<></>}
    />
  );
}

const Key = styled.code`
  display: inline-block;
  padding: 4px;
  margin-right: 4px;
  min-width: 20px;
  text-align: center;
  background-color: #eee;
  border: 1px solid #c8c8c8;
  border-radius: 4px;
  flex: none;
`;

const Entry = ({ keyCode, desc }: { keyCode: string; desc: ReactNode }) => {
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-start;
      `}
    >
      <Key>{keyCode}</Key>
      <div
        css={css`
          display: flow-root;
          padding: 2px 0;
          line-height: 1.4;
        `}
      >
        {desc}
      </div>
    </div>
  );
};
