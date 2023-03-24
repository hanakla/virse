import { styleWhen } from '@hanakla/arma';
import NextLink from 'next/link';
import styled from 'styled-components';

export const Link = styled(NextLink)`
  color: #0070f3;
  ${(props) => styleWhen(!!props['aria-disabled'])`
    color: inherit;
    pointer-events: none;
  `}
`;
