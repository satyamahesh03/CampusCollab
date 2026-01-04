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
    <div className="fixed top-20 right-4 z-50 space-y-2">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className={`rounded-lg shadow-lg p-3 flex items-center space-x-2 max-w-sm ${
              notification.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : notification.type === 'error'
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}
          >
            {getIcon(notification.type)}
            <div className="flex-1">
              {notification.title && (
                <h4 className={`font-semibold text-xs ${
                  notification.type === 'success' 
                    ? 'text-green-900' 
                    : notification.type === 'error'
                    ? 'text-red-900'
                    : 'text-amber-900'
                }`}>{notification.title}</h4>
              )}
              <p className={`text-xs font-medium ${
                notification.type === 'success' 
                  ? 'text-green-800' 
                  : notification.type === 'error'
                  ? 'text-red-800'
                  : 'text-amber-800'
              }`}>{notification.message}</p>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className={`hover:opacity-70 transition-opacity ${
                notification.type === 'success' 
                  ? 'text-green-600' 
                  : notification.type === 'error'
                  ? 'text-red-600'
                  : 'text-amber-600'
              }`}
            >
              <FaTimes className="text-xs" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default Notification;

