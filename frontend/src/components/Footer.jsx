import { Github, Linkedin, Twitter, Mail, Phone, MapPin, Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white/5 rounded-full blur-3xl"></div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center space-x-2 mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-indigo-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CC</span>
              </div>
              <span className="text-xl font-bold">Campus Collab</span>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              A unified platform for collaboration across every department. Connect, build, and grow together.
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3 text-gray-300">
                <Mail size={16} className="text-blue-400" />
                <span>22331a0575@mvgrce.edu.in</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-300">
                <Phone size={16} className="text-blue-400" />
                <span>+91 86394 57769</span>
              </li>
              <li className="flex items-center space-x-3 text-gray-300">
                <MapPin size={16} className="text-blue-400" />
                <span>MVGR College of Engineering</span>
              </li>
            </ul>
          </div>

          {/* Stay Connected */}
          <div>
            <h3 className="text-lg font-semibold mb-6 text-white">Stay Connected</h3>
            <p className="text-gray-300 mb-4">Follow our channels for updates and community highlights.</p>
            <div className="flex space-x-4">
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Github size={20} />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Linkedin size={20} />
              </a>
              <a href="#" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="mailto:support@campuscollab.com" className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                <Mail size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-white/10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-gray-300">
              <span>&copy; 2025 Campus Collab. All rights reserved.</span>
            </div>
            {/* <div className="flex items-center space-x-2 text-gray-300">
              <span>Made with</span>
              <Heart size={16} className="text-red-400 fill-current" />
              <span>for students</span>
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;