import React from 'react';

export function LambdaLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3.5" 
      strokeLinecap="square"
      strokeLinejoin="miter" 
      {...props}
    >
      <path d="M7 6h4l8 15 M14.5 12.5L7 21" />
    </svg>
  );
}
