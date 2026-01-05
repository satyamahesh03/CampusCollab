import { useState } from 'react';
import { motion } from 'framer-motion';
import { FaMagic, FaTimes } from 'react-icons/fa';
import { projectAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import geminiIcon from '../assets/gemini-icon.png';

const ProjectAISummarize = ({ projectId, description }) => {
  const [summary, setSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const { addNotification } = useGlobal();

  const handleSummarize = async () => {
    try {
      setSummarizing(true);
      const response = await projectAPI.summarize(projectId);
      setSummary(response.data.summary);
      setShowSummary(true);
    } catch (error) {
      addNotification({
        type: 'error',
        message: error.message || 'Failed to generate summary. Please try again later.',
      });
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-row items-center justify-between mb-3 sm:mb-4 gap-3">
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900">About this Project</h3>
        <button
          onClick={handleSummarize}
          disabled={summarizing}
          className="group relative flex items-center justify-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-white rounded-full hover:from-amber-700 hover:to-amber-600 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-amber-600/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md text-xs font-medium overflow-hidden backdrop-blur-sm border border-amber-400/20 hover:border-amber-500/40"
          title="Generate AI summary using Google Gemini"
        >
          {/* Subtle shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
          
          {summarizing ? (
            <>
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent relative z-10"></div>
              <span className="relative z-10">Summarizing...</span>
            </>
          ) : (
            <>
              <img 
                src={geminiIcon} 
                alt="summarize" 
                className="w-3.5 h-3.5 object-contain relative z-10 group-hover:scale-110 transition-transform duration-300"
                draggable="false"
              />
              <span className="relative z-10">Summarize</span>
            </>
          )}
        </button>
      </div>
      
      {/* Skeleton Loader while summarizing */}
      {summarizing && !summary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-base font-semibold text-amber-900 flex items-center gap-2">
              <FaMagic className="text-amber-600" />
              AI Summary (Powered by Google Gemini)
            </h4>
          </div>
          <div className="space-y-3">
            <div className="h-4 bg-amber-200/50 rounded animate-pulse"></div>
            <div className="h-4 bg-amber-200/50 rounded animate-pulse w-5/6"></div>
            <div className="h-4 bg-amber-200/50 rounded animate-pulse w-4/6"></div>
            <div className="h-4 bg-amber-200/50 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-amber-200/50 rounded animate-pulse w-5/6"></div>
          </div>
        </motion.div>
      )}
      
      {showSummary && summary && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg"
        >
          <div className="flex items-start justify-between mb-3">
            <h4 className="text-base font-semibold text-amber-900 flex items-center gap-2">
              <FaMagic className="text-amber-600" />
              AI Summary (Powered by Google Gemini)
            </h4>
            <button
              onClick={() => setShowSummary(false)}
              className="text-gray-400 hover:text-gray-600 transition"
              title="Hide summary"
            >
              <FaTimes size={14} />
            </button>
          </div>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words text-xs sm:text-sm">{summary}</p>
        </motion.div>
      )}
      
      <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 sm:p-4 md:p-6 border border-amber-100/50">
        <p className={`text-gray-700 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm ${showSummary ? 'opacity-60' : ''}`}>
          {description}
        </p>
      </div>
    </div>
  );
};

export default ProjectAISummarize;

