import { useEffect, useRef } from "react";
import { useDropArea } from "react-use";
import { css } from "styled-components";

export default function Dev() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [handleDrop] = useDropArea({
    onFiles: (files) => {},
  });

  useEffect(() => {}, []);

  return (
    <canvas
      css={css`
        width: 100%;
        height: 100%;
      `}
      ref={canvasRef}
      {...handleDrop}
    />
  );
}
