import React from 'react'

export const LambdaLogo: React.FC<React.SVGProps<SVGSVGElement>> = ({
  className = 'w-6 h-6',
  ...props
}) => {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Modern geometric Greek Lambda (λ) — universal symbol for Wavelength */}
      <path 
        d="M17.5 3.5H15.2C14.5 3.5 13.9 3.9 13.5 4.5L6.5 20.5" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M11.5 12.2L17.5 20.5" 
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  )
}

export default LambdaLogo
