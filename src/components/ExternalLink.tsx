import { AnchorHTMLAttributes, DetailedHTMLProps, forwardRef } from 'react';
import styled from 'styled-components';

type Props = DetailedHTMLProps<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  HTMLAnchorElement
>;

export const ExternalLink = forwardRef<HTMLAnchorElement, Props>(
  (props, ref) => {
    return (
      <Anchor {...props} ref={ref} target="_blank" rel="noopener noreferrer" />
    );
  }
);

const Anchor = styled.a`
  color: #0070f3;
`;
