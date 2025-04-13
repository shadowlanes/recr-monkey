import React from 'react';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ size = 'medium' }) => {
  // Size classes
  const containerSizeClasses = {
    small: 'h-16 w-16',
    medium: 'h-24 w-24',
    large: 'h-32 w-32'
  };
  
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`${containerSizeClasses[size]} relative`}>
        {/* Monkey animation container */}
        <div className="relative animate-bounce">
          {/* Monkey emoji with a slight wiggle animation */}
          <div className="text-4xl animate-pulse" style={{ animationDuration: '2s' }}>
            🐒
          </div>
          
          {/* Cash animation - floating dollar bills */}
          <div className="absolute top-0 right-0 animate-ping" style={{ animationDuration: '1.5s' }}>
            💵
          </div>
          <div className="absolute top-2 left-1 animate-ping" style={{ animationDuration: '1.3s', animationDelay: '0.2s' }}>
            💰
          </div>
          <div className="absolute bottom-1 right-2 animate-ping" style={{ animationDuration: '1.7s', animationDelay: '0.4s' }}>
            💵
          </div>
        </div>
      </div>
      
      {/* Loading text */}
      <div className={`mt-3 ${textSizeClasses[size]} text-indigo-600 font-medium`}>
        <span className="inline-block animate-pulse" style={{ animationDuration: '1s' }}>
          Loading
        </span>
        <span className="inline-block animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.2s' }}>.</span>
        <span className="inline-block animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.4s' }}>.</span>
        <span className="inline-block animate-pulse" style={{ animationDuration: '1s', animationDelay: '0.6s' }}>.</span>
      </div>
    </div>
  );
};

export default LoadingAnimation;