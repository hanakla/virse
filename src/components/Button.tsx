import { styleWhen } from '@hanakla/arma';
import styled from 'styled-components';
import { transitionCss } from '../styles/mixins';

export const Button = styled.button.withConfig<{
  kind?: 'default' | 'primary';
  size?: 'min';
  blocked?: boolean;
}>({
  shouldForwardProp(prop, valid) {
    return prop !== 'kind' && valid(prop);
  },
})`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
  padding: 8px;
  cursor: pointer;

  color: #34c0b9;
  background-color: #fff;
  border: none;
  border-radius: 100px;
  font-size: 14px;

  ${transitionCss}

  &:hover {
    background-color: #f5f5f5;
  }

  &:active {
    background-color: #d5d5d5;
  }

  &[disabled] {
    cursor: not-allowed;
    opacity: 0.5;
  }

  ${({ size }) => styleWhen(size === 'min')`
    padding: 4px;
    font-size: 12px;
  `}

  ${({ kind }) => styleWhen(kind === 'primary')`
    color: #fff;
    background-color:  #34c0b9;

    &:hover {
      background-color: #2ea89e;
    }

    &:active {
      background-color: #238981;
    }
  `}

  ${({ blocked }) => styleWhen(!!blocked)`
      display: block;
      width: 100%;
  `}
`;
