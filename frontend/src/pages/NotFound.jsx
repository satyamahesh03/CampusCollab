import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaSearch } from 'react-icons/fa';
import cclogo from '../assets/cclogo.png';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="text-center max-w-lg mx-auto w-full px-4">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-8 flex justify-center"
                >
                    <img
                        src={cclogo}
                        alt="Campus Collab"
                        className="h-16 md:h-20 w-auto object-contain"
                    />
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="relative"
                >
                    {/* Animated 404 Text */}
                    <h1 className="text-6xl sm:text-8xl md:text-9xl font-bold text-amber-500/20 select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{
                                type: "spring",
                                stiffness: 200,
                                damping: 15,
                                delay: 0.3
                            }}
                            className="bg-white p-4 sm:p-6 rounded-full shadow-xl border-4 border-amber-100"
                        >
                            <FaSearch className="text-2xl sm:text-4xl text-amber-500" />
                        </motion.div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 sm:mt-8 space-y-3 sm:space-y-4"
                >
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
                        Page Not Found
                    </h2>
                    <p className="text-gray-600 text-base sm:text-lg px-2">
                        Oops! The page you are looking for is not available.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8">
                        <button
                            onClick={() => navigate('/')}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <FaHome />
                            Back to Home
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            className="w-full sm:w-auto px-6 py-3 bg-white border-2 border-amber-100 hover:border-amber-200 text-gray-700 rounded-xl font-semibold hover:bg-amber-50 transition-all"
                        >
                            Go Back
                        </button>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default NotFound;
