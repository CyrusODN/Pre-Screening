import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  onClick?: () => void;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 'md', 
  showText = true,
  onClick 
}) => {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-12',
    lg: 'h-16',
    xl: 'h-20'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div 
      className={`flex items-center gap-3 cursor-pointer group ${className}`}
      onClick={onClick}
    >
      {/* SVG Logo */}
      <div className="relative overflow-hidden rounded-lg">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 5563 1373" 
          className={`
            ${sizeClasses[size]} 
            w-auto 
            transition-all 
            duration-300 
            ease-in-out
            group-hover:scale-110
            filter
            drop-shadow-md
          `}
        >
          <g transform="matrix(1,0,0,1,-5776,-4887)">
            <g transform="matrix(0.667511,0,0,0.164628,5776.11,4887.65)">
              <g transform="matrix(5.37388,0,0,21.7893,-1090.81,-17616.5)">
                <g transform="matrix(0.24,0,0,0.24,201.685,799.993)">
                  <path d="M1176.72,647.641C1176.72,520.486 1071.36,433.997 962.572,433.997L508.093,433.997L508.093,501.548L962.572,501.548C1052.44,501.548 1108,568.887 1108,647.641C1108,726.396 1052.44,793.031 962.572,793.031L739.176,793.031L739.176,860.518L776.001,860.518L1049.64,1232.67L1128.38,1232.67L858.779,860.518L962.572,860.518C1071.36,860.518 1176.72,774.796 1176.72,647.641ZM2008.04,860.216L1940.37,860.216L1940.37,1232.67L2008.04,1232.67L2008.04,860.216ZM2680.33,434.531L2680.33,1232.67L2747.29,1232.67L2747.29,434.531L2680.33,434.531ZM1290.37,1165.14L1795.27,1165.14L1795.27,1232.67L1290.37,1232.67L1290.37,1165.14ZM2896.35,1165.14L3401.24,1165.14L3401.24,1232.67L2896.35,1232.67L2896.35,1165.14ZM4376.53,434.216L4294.35,434.216L4616.69,953.293L4618,1232.57L4690.89,1232.57L4689.89,952.251L4376.53,434.216ZM3863.28,434.531L3562.67,434.531L3562.67,501.428L3858.77,501.428C4082.51,501.428 4218.45,639.906 4218.45,833.951C4218.45,1028 4082.51,1165.05 3858.77,1165.05L3629.81,1165.05L3628.53,793.12L3562.67,793.12L3562.67,1232.57L3863.28,1232.57C4102.99,1232.57 4286.65,1073.66 4286.65,833.951C4286.65,594.239 4102.99,434.531 3863.28,434.531ZM4936.71,434.216L4688.72,837.117L4726.23,895.347L5013.63,434.216L4936.71,434.216ZM1940.37,793.12L2008.04,793.12L2008.04,541.222L2335.89,860.312L2355.88,860.312L2613.16,609.034L2613.16,513.295L2346.37,777.72L2008.04,434.531L1940.37,434.531L1940.37,793.12ZM1290.37,793.12L1763,793.12L1763,860.312L1290.37,860.312L1290.37,793.12ZM2896.35,793.12L3368.97,793.12L3368.97,860.312L2896.35,860.312L2896.35,793.12ZM1290.37,433.997L1795.27,433.997L1795.27,501.524L1290.37,501.524L1290.37,433.997ZM2896.35,433.997L3401.24,433.997L3401.24,501.524L2896.35,501.524L2896.35,433.997Z" style={{ fill: 'rgb(13,13,13)', fillRule: 'nonzero' }} />
                </g>
                <g transform="matrix(0.24,0,0,0.24,-147.422,-2001.1)">
                  <path d="M2028.91,12464.3L2028.91,12360.6L1961.38,12360.6L1961.38,12464.3L1857.65,12464.3L1857.65,12531.9L1961.38,12531.9L1961.38,12635.6L2028.91,12635.6L2028.91,12531.9L2132.65,12531.9L2132.65,12464.3L2028.91,12464.3Z" style={{ fill: 'url(#_Linear1)' }} />
                </g>
                <g transform="matrix(0.278775,0,0,0.278775,218.948,767.68)">
                  <path d="M4667.74,489.542L4627.92,489.542L4311.62,1177.11L4377.26,1177.11L4651.92,573.995L4888.16,1119.76L4647.83,1119.76L4631.24,1177.12L4979.54,1177.12L4979.53,1177.11L4984.04,1177.11L4667.74,489.542ZM5133.98,1177.11L5076.22,1177.11L5076.22,489.542L5133.98,489.542L5133.98,1177.11Z" style={{ fill: 'url(#_Linear2)', fillRule: 'nonzero' }} />
                </g>
              </g>
            </g>
          </g>
          <defs>
            <linearGradient id="_Linear1" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(274.998,0,0,-275.002,1857.65,12498.1)">
              <stop offset="0" style={{ stopColor: 'rgb(61,151,197)', stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: 'rgb(79,215,199)', stopOpacity: 1 }} />
            </linearGradient>
            <linearGradient id="_Linear2" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(822.362,0,0,-687.589,4311.61,833.334)">
              <stop offset="0" style={{ stopColor: 'rgb(61,151,197)', stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: 'rgb(79,215,199)', stopOpacity: 1 }} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Continuous Shine Effect - działa cały czas */}
        <div className="
          absolute 
          inset-0 
          bg-gradient-to-r 
          from-transparent 
          via-white/20 
          to-transparent 
          animate-shine
          skew-x-12
          pointer-events-none
        " />
      </div>

      {/* Company Text */}
      {showText && (
        <div className="flex flex-col">
          <h1 className={`
            ${textSizeClasses[size]} 
            font-bold 
            bg-gradient-to-r 
            from-remedy-primary 
            via-remedy-accent 
            to-remedy-secondary 
            bg-clip-text 
            text-transparent
            group-hover:from-remedy-accent
            group-hover:via-remedy-primary
            group-hover:to-remedy-accent
            transition-all
            duration-300
            leading-tight
          `}>
            Remedius
          </h1>
          <p className={`
            text-slate-600 
            group-hover:text-remedy-primary 
            transition-colors 
            duration-300
            ${size === 'sm' ? 'text-xs' : size === 'lg' || size === 'xl' ? 'text-sm' : 'text-xs'}
            font-medium
            leading-tight
          `}>
            Pre-Screening System
          </p>
        </div>
      )}
    </div>
  );
}; 