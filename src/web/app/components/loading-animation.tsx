import React from 'react';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ size = 'medium' }) => {
  // Size classes with improved scaling
  const containerSizeClasses = {
    small: 'h-20 w-20',
    medium: 'h-28 w-28',
    large: 'h-36 w-36'
  };
  
  const textSizeClasses = {
    small: 'text-sm',
    medium: 'text-lg',
    large: 'text-xl'
  };

  const cardSizeClasses = {
    small: 'p-4',
    medium: 'p-6',
    large: 'p-8'
  };

  return (
    <div className="flex items-center justify-center min-h-[200px]">
      {/* Card container for visual hierarchy */}
      <div className={`bg-white rounded-2xl shadow-xl border border-gray-100 ${cardSizeClasses[size]} transition-all duration-300 hover:shadow-2xl`}>
        <div className="flex flex-col items-center justify-center space-y-4">
          {/* Enhanced animation container */}
          <div className={`${containerSizeClasses[size]} relative`}>
            {/* Monkey animation with improved styling */}
            <div className="relative animate-bounce">
              {/* Main monkey emoji with enhanced animation */}
              <div 
                className="text-5xl filter drop-shadow-lg transition-transform duration-300 hover:scale-110" 
                style={{ 
                  animationDuration: '2s',
                  animationName: 'pulse'
                }}
              >
                🐒
              </div>
            </div>
          </div>
          
          {/* Enhanced loading text with modern typography */}
          <div className="text-center space-y-2">
            <div className={`${textSizeClasses[size]} font-bold text-gray-800 tracking-wide`}>
              <span className="inline-block animate-pulse text-blue-600" style={{ animationDuration: '1s' }}>
                Loading
              </span>
              <span className="inline-block animate-pulse text-emerald-500" style={{ animationDuration: '1s', animationDelay: '0.2s' }}>.</span>
              <span className="inline-block animate-pulse text-amber-500" style={{ animationDuration: '1s', animationDelay: '0.4s' }}>.</span>
              <span className="inline-block animate-pulse text-violet-500" style={{ animationDuration: '1s', animationDelay: '0.6s' }}>.</span>
            </div>
            
            {/* Additional engaging text */}
            <p className="text-sm text-gray-500 font-medium">
              Getting things ready for you
            </p>
          </div>
          
          {/* Progress indicator bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-violet-500 rounded-full animate-pulse"
              style={{
                width: '60%',
                animation: 'progress 2s ease-in-out infinite'
              }}
            ></div>
          </div>
        </div>
      </div>
      
      {/* Custom keyframes for progress animation */}
      <style jsx>{`
        @keyframes progress {
          0% { width: 20%; }
          50% { width: 80%; }
          100% { width: 20%; }
        }
      `}</style>
    </div>
  );
};

export default LoadingAnimation;