import { useState, useEffect } from 'react';
import { reminderAPI } from '../utils/api';
import { useGlobal } from '../context/GlobalContext';
import Loading from '../components/Loading';
import { formatDate } from '../utils/helpers';
import { FaTrash } from 'react-icons/fa';
import { motion } from 'framer-motion';

const Reminders = () => {
  const [loading, setLoading] = useState(false);
  const { reminders, setReminders, addNotification, newReminderIds, refreshReminders } = useGlobal();

  useEffect(() => {
    // Reminders are already loaded in GlobalContext
    // Just refresh to ensure latest data
    refreshReminders();
  }, []);

  const handleDelete = async (id) => {
    try {
      await reminderAPI.delete(id);
      setReminders(reminders.filter((r) => r._id !== id));
      addNotification({ type: 'success', message: 'Reminder deleted' });
    } catch (error) {
      addNotification({ type: 'error', message: 'Failed to delete reminder' });
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">My Reminders</h1>
      
      {reminders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reminders yet. Save internships, hackathons, or drives to get reminders here!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reminders.map((reminder) => {
            const isNew = newReminderIds.includes(reminder._id);
            
            return (
              <motion.div
                key={reminder._id}
                initial={{ opacity: 0, x: -20 }}
                animate={isNew ? {
                  opacity: 1,
                  x: 0,
                  rotate: [0, -2, 2, -2, 2, 0],
                  transition: {
                    rotate: {
                      duration: 0.5,
                      repeat: 3,
                      ease: "easeInOut"
                    }
                  }
                } : { opacity: 1, x: 0 }}
                className={`bg-white rounded-lg shadow-md p-6 flex justify-between items-start ${
                  isNew ? 'ring-2 ring-primary-400 shadow-lg' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      isNew 
                        ? 'bg-green-100 text-green-700 animate-pulse' 
                        : 'bg-primary-100 text-primary-700'
                    }`}>
                      {reminder.itemType}
                      {isNew && ' • NEW'}
                    </span>
                    <h3 className="text-xl font-semibold">{reminder.item?.title}</h3>
                  </div>
                  <p className="text-gray-600 mb-2">{reminder.item?.description?.substring(0, 150)}...</p>
                  {reminder.itemType === 'internship' && (
                    <p className="text-sm text-gray-500">
                      Deadline: {formatDate(reminder.item?.applicationDeadline)}
                    </p>
                  )}
                  {reminder.itemType === 'hackathon' && (
                    <p className="text-sm text-gray-500">
                      Start Date: {formatDate(reminder.item?.startDate)}
                    </p>
                  )}
                  {reminder.itemType === 'drive' && (
                    <p className="text-sm text-gray-500">
                      Drive Date: {formatDate(reminder.item?.driveDate)}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(reminder._id)}
                  className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <FaTrash />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Reminders;

