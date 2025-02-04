import { styleWhen } from '@hanakla/arma';
import styled from 'styled-components';

export const Input = styled.input.withConfig<{ sizing?: 'min' }>({
  shouldForwardProp(prop, valid) {
    return prop !== 'sizing' && valid(prop);
  },
})`
  display: block;
  width: 100%;
  padding: 8px 12px;
  background-color: #fff;
  border: none;
  border-radius: 4px;
  outline: none;
  color: initial;

  ${({ sizing }) => styleWhen(sizing === 'min')`
    padding: 6px 8px;
  `}
`;
