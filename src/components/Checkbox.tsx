import { rgba } from "polished";
import styled from "styled-components";

export const Checkbox = styled.input.attrs((props) => ({
  ...props,
  type: "checkbox",
}))`
  margin: 0;
  border: 1px solid ${rgba("#575757", 0.5)};
  background-color: #ffffff;
  outline: none;

  &:checked {
    border: 1px solid #575757;
  }
`;
