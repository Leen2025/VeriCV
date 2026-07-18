import { Github, LinkedinIcon } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-muted/50 border-t">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Logo & Copyright */}
          <div className="flex items-center space-x-4">
            <div className="w-6 h-6 gradient-primary rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">V</span>
            </div>
            <span className="text-sm text-muted-foreground">
              © 2025 VeriCV. All rights reserved.
            </span>
          </div>

          {/* Social Icons */}
          <div className="flex items-center space-x-3">
            <Link
              to="/team"
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <Github className="w-5 h-5" />
            </Link>
            <Link
              to="/team"
              className="text-muted-foreground hover:text-primary transition-smooth"
            >
              <LinkedinIcon className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
