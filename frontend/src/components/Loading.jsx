const Loading = ({ text = 'Loading...', size = 'md', fullScreen = false, className = '' }) => {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-4',
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50'
    : 'flex flex-col items-center justify-center py-12';

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className={`animate-spin rounded-full ${sizeClasses[size]} border-amber-600 border-t-transparent`}></div>
      {text && <p className="mt-4 text-gray-600 text-sm">{text}</p>}
    </div>
  );
};

export default Loading;

