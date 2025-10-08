import { memo, ReactNode } from "react";
import { RiRefreshLine } from "react-icons/ri";
import { useBufferedState } from "../utils/hooks";
import { Button } from "./Button";
import { Input } from "./Input";
import { twx } from "@/utils/twx";

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
      <div title={title} className="flex justify-center mb-2 text-sm">
        <div
          className={twx(
            "flex whitespace-nowrap overflow-auto font-bold s",
            "scrollbar-none",
          )}
        >
          {label}
        </div>

        <Input
          className="w-[4em] mx-1 p-0.5 ml-auto border border-solid border-gray-200 [&::-webkit-inner-spin-button]:hidden"
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
            if (e.key === "Enter") onChange(val);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
          }}
          onBlur={(e) => {
            onChange(e.currentTarget.valueAsNumber);
          }}
        />

        <Button
          className="flex-0 aspect-square leading-none"
          kind="default"
          size="min"
          onClick={() => onChange(defaultValue)}
        >
          <RiRefreshLine />
        </Button>
      </div>

      <input
        className={twx(
          "block w-[calc(100%-8px)] h-[4px] mx-1 leading-none [-webkit-touch-callout:none]",
          "appearance-none outline-none bg-white shadow-[0_0_4px_rgba(0,0,0,0.2)] rounded-full",
          "[&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-white",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-300",
        )}
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
