import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGlobal } from '../context/GlobalContext';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const Notification = () => {
  const { notifications, removeNotification } = useGlobal();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      case 'error':
        return <FaExclamationCircle className="text-red-500" />;
      case 'info':
        return <FaInfoCircle className="text-amber-500" />;
      default:
        return <FaInfoCircle className="text-gray-500" />;
    }
  };

  return (
    <div className="fixed top-20 right-4 z-[100] space-y-3 flex flex-col items-end pointer-events-none md:top-24 md:right-5">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            layout
            className="pointer-events-auto relative w-full max-w-[calc(100vw-2rem)] md:max-w-sm overflow-hidden rounded-xl md:rounded-2xl bg-white/95 backdrop-blur-md p-3 md:p-4 shadow-xl ring-1 ring-black/5"
          >
            <div className={`absolute inset-0 opacity-[0.03] ${notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
                'bg-amber-500'
              }`} />

            <div className="relative flex items-start gap-3 md:gap-4">
              {/* Icon Container with Warm Glow */}
              <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 md:p-2 bg-white shadow-sm ring-1 ring-black/5 ${notification.type === 'success' ? 'text-green-600' :
                notification.type === 'error' ? 'text-red-600' :
                  'text-amber-600'
                }`}>
                {getIcon(notification.type)}
              </div>

              <div className="flex-1 pt-0.5 md:pt-1">
                {notification.title && (
                  <h4 className={`text-xs md:text-sm font-bold leading-none mb-1 ${notification.type === 'success' ? 'text-green-900' :
                    notification.type === 'error' ? 'text-red-900' :
                      'text-amber-900'
                    }`}>
                    {notification.title}
                  </h4>
                )}
                <p className="text-xs md:text-sm font-medium text-gray-600 leading-relaxed">
                  {notification.message}
                </p>
              </div>

              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 rounded-lg p-1 md:p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all focus:outline-none"
              >
                <span className="sr-only">Close</span>
                <FaTimes className="text-xs md:text-sm" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Notification;

