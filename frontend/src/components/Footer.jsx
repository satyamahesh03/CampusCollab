import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-amber-50 via-yellow-50 to-yellow-100 text-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-32 h-32 bg-amber-200/30 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-yellow-200/20 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 mb-8 md:mb-12">
          {/* Brand */}
          <div className="flex flex-col">
            <div className="flex items-center space-x-2 mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-yellow-400 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm sm:text-base">CC</span>
              </div>
              <span className="text-xl sm:text-2xl font-bold text-gray-900">Campus Collab</span>
            </div>
            <p className="text-gray-700 text-sm sm:text-base leading-relaxed max-w-md">
              A unified platform for collaboration across every department. Connect, build, and grow together.
            </p>
          </div>

          {/* Contact */}
          <div className="flex flex-col">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-gray-900">Contact Us</h3>
            <ul className="space-y-3 sm:space-y-4">
              <li>
                <a 
                  href="mailto:campuscollabofficial@gmail.com" 
                  className="flex items-center space-x-3 sm:space-x-4 text-gray-700 hover:text-amber-600 transition-colors group"
                >
                  <div className="p-2.5 sm:p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors flex-shrink-0">
                    <Mail size={18} className="text-amber-600" />
                  </div>
                  <span className="text-sm sm:text-base break-all">campuscollabofficial@gmail.com</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/919494252900" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 sm:space-x-4 text-gray-700 hover:text-amber-600 transition-colors group"
                >
                  <div className="p-2.5 sm:p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors flex-shrink-0">
                    <Phone size={18} className="text-amber-600" />
                  </div>
                  <span className="text-sm sm:text-base">+91 94942 52900</span>
                </a>
              </li>
              <li>
                <a 
                  href="https://www.google.com/maps/search/MVGR+College+of+Engineering" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center space-x-3 sm:space-x-4 text-gray-700 hover:text-amber-600 transition-colors group"
                >
                  <div className="p-2.5 sm:p-3 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors flex-shrink-0">
                    <MapPin size={18} className="text-amber-600" />
                  </div>
                  <span className="text-sm sm:text-base">MVGR College of Engineering</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-amber-200/50 pt-6 sm:pt-8">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-2 text-gray-700 text-sm sm:text-base">
              <span>&copy; 2026 Campus Collab. All rights reserved.</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;