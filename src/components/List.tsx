import { styleWhen } from "@hanakla/arma";
import { rgba } from "polished";
import styled from "styled-components";

export const List = styled.ul`
  display: flex;
  flex-flow: column;
  /* gap: 4px; */
  padding: 8px 0;
  background-color: ${rgba("#fff", 0.8)};
  border-radius: 8px;
  font-size: 14px;
`;

export const ListItem = styled.li<{ active?: boolean }>`
  padding: 6px;
  color: #444;
  user-select: none;
  cursor: default;

  ${({ active }) => styleWhen(!!active)`
    background-color: ${rgba("#31cde9", 0.8)};
  `}

  ${({ active }) => styleWhen(!active)`
    &:active,
    &:focus,
    &:hover {
        background-color: ${rgba("#31cde9", 0.5)};
    }
  `}
`;
