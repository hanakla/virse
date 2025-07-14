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
  defaultValue = 0,
  value,
  onChange,
}: {
  label: ReactNode;
  title?: string;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const [bufferedValue, setValue] = useBufferedState(value);

  return (
    <div>
      <div title={title} className="flex mb-2 text-sm">
        <div
          css={`
            &::-webkit-scrollbar {
              width: 0;
              height: 0;
            }
          `}
          className="flex whitespace-nowrap overflow-auto font-bold"
        >
          {label}
        </div>

        <Input
          css={`
            &::-webkit-inner-spin-button {
              display: none;
            }
          `}
          className="w-[4em] mx-1 p-0.5 border border-solid border-gray-200"
          type="number"
          $size="min"
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
          className="ml-auto flex-[0] leading-none"
          kind="default"
          size="min"
          onClick={() => onChange(defaultValue)}
        >
          <RiRefreshLine />
        </Button>
      </div>

      <RangeInput
        className="block w-[calc(100%-8px)] ml-2"
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
  height: 4px;
  margin: 4px 0;

  appearance: none;
  --webkit-touch-callout: none;
  outline: none;
  line-height: 1;

  background-color: #fff;
  box-shadow: 0 0 4px ${rgba('#000', 0.2)};
  border-radius: 100px;

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

    /* box-shadow: 0 0 2px #aaa; */
    border: 1px solid #aaa;
  }
`;
