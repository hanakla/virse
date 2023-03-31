import { ComponentProps, forwardRef } from 'react';
import styled from 'styled-components';

type Props = ComponentProps<'a'>;

export const ExternalLink = forwardRef<HTMLAnchorElement, Props>(
  function ExternalLink(props, ref) {
    return (
      <Anchor {...props} ref={ref} target="_blank" rel="noopener noreferrer" />
    );
  }
);

const Anchor = styled.a`
  color: #0070f3;
`;
