import { memo, ReactNode } from 'react';
import { RiRefreshLine } from 'react-icons/ri';
import styled from 'styled-components';
import { useBufferedState } from '../utils/hooks';
import { Button } from './Button';
import { Input } from './Input';
import { rgba } from 'polished';

export const Slider = memo(function Slider({
  label,
  title,
  min,
  max,
  step = 0.01,
  value,
  onChange,
}: {
  label: ReactNode;
  title?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [bufferedValue, setValue] = useBufferedState(value);

  return (
    <div>
      <div
        css={`
          display: flex;
          margin-bottom: 8px;
          font-size: 14px;
        `}
        title={title}
      >
        <div
          css={`
            flex: 1;
            /* text-overflow: ellipsis; */
            white-space: nowrap;
            overflow: auto;
            font-weight: bold;

            &::-webkit-scrollbar {
              width: 0;
              height: 0;
            }
          `}
        >
          {label}
        </div>

        <Input
          css={`
            width: 4em;
            margin: 0 4px;
            padding: 2px;

            &::-webkit-inner-spin-button {
              display: none;
            }
          `}
          type="number"
          sizing="min"
          step={step}
          value={bufferedValue}
          onChange={(e) => {
            const val = e.currentTarget.valueAsNumber;
            if (Number.isNaN(val)) return;
            setValue(val);
          }}
          onKeyDown={(e) => {
            const val = e.currentTarget.valueAsNumber;
            if (Number.isNaN(val)) return;
            if (e.key === 'Enter') onChange(val);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onBlur={(e) => {
            onChange(e.currentTarget.valueAsNumber);
          }}
        />

        <Button
          css={`
            margin-left: auto;
            flex: 0;
            line-height: 1;
          `}
          kind="default"
          size="min"
          onClick={() => onChange(0)}
        >
          <RiRefreshLine />
        </Button>
      </div>

      <RangeInput
        css={`
          display: block;
          width: calc(100% - 8px);
          margin-left: 8px;
        `}
        min={min}
        max={max}
        step={step}
        type="range"
        value={bufferedValue}
        onChange={(e) => {
          setValue(e.currentTarget.valueAsNumber);
          onChange(e.currentTarget.valueAsNumber);
        }}
      />
    </div>
  );
});

const RangeInput = styled.input`
  display: block;
  width: 100%;
  height: 2px;
  margin: 4px 0;

  appearance: none;
  --webkit-touch-callout: none;
  outline: none;
  line-height: 1;

  box-shadow: 0 0 4px ${rgba('#000', 0.2)};

  /* &::-ms-fill-lower,
  &::-moz-range-track,
  &::-webkit-slider-runnable-track {
    background: #28b8f1 !important;
  } */

  &::-webkit-slider-thumb {
    width: 12px;
    height: 12px;
    appearance: none;
    background: #fff;
    border-radius: 100px;

    box-shadow: 0 0 2px #aaa;
  }
`;
