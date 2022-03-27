import { styleWhen } from "@hanakla/arma";
import styled from "styled-components";

export const Input = styled.input.withConfig<{ size?: "min" }>({
  shouldForwardProp(prop, valid) {
    return prop !== "size" && valid(prop);
  },
})`
  display: block;
  width: 100%;
  padding: 8px 12px;
  background-color: #eeeeee;
  border: none;
  border-radius: 4px;
  outline: none;

  ${({ size }) => styleWhen(size === "min")`
    padding: 4px 8px;
  `}
`;
