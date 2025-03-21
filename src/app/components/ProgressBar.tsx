const ProgressBar = ({ label, value, max, color }: { label: string; value: number; max: number; color: string }) => {
    return (
      <div className="w-full">
        <p className="text-sm font-semibold">{label}</p>
        <div className="w-full h-4 bg-gray-700 rounded-md overflow-hidden relative">
          <div 
            className={`h-full ${color} transition-all duration-300`} 
            style={{ width: `${(value / max) * 100}%` }}
          />
          <span className="absolute inset-0 flex justify-center items-center text-xs text-white">
            {value}/{max}
          </span>
        </div>
      </div>
    );
  };

  export default ProgressBar;
  