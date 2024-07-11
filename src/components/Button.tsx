import { styleWhen } from '@hanakla/arma';
import { rgba } from 'polished';
import styled from 'styled-components';
import { transitionCss } from '../styles/mixins';

export type ButtonKind = 'default' | 'primary' | 'danger';

export const Button = styled.button.withConfig<{
  kind?: ButtonKind;
  size?: 'min';
  blocked?: boolean;
}>({
  shouldForwardProp(prop) {
    return prop !== 'kind';
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
  outline: none;

  ${transitionCss}

  &:hover {
    background-color: #eaeaea;
  }

  &:active,
  &:focus {
    background-color: #d6d6d6;
    box-shadow: 0 0 0 3px ${rgba('#34c0b9', 0.6)};
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

    &:active, &:focus {
      background-color: #238981;
    }
  `}

  ${({ kind }) => styleWhen(kind === 'danger')`
    color: #fff;
    background-color: #f44336;

    &:hover {
      background-color: #e53935;
    }

    &:active, &:focus {
      background-color: #c62828;
      box-shadow: 0 0 0 3px ${rgba('#ec2929', 0.6)};
    }
  `}

  ${({ blocked }) => styleWhen(!!blocked)`
      display: block;
      width: 100%;
  `}
`;
