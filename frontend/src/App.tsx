import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import CvGateRoute from "./components/CvGateRoute";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import UploadPage from "./pages/UploadPage";
import QuizPage from "./pages/QuizPage";
import ResultsPage from "./pages/ResultsPage";
import AssessmentResultPage from "@/pages/AssessmentResultPage";
import DashboardPage from "@/pages/DashboardPage";
import AboutPage from "./pages/AboutPage";
import TeamPage from "./pages/TeamPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "./context/AuthContext";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import AuthTabs from "./pages/AuthTabs";
import JobMatchPage from "./pages/JobMatchPage";


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <AuthProvider>
            <Layout>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<AuthTabs initialTab="signin" />} />
                <Route path="/register" element={<AuthTabs initialTab="signup" />} />

                <Route path="/team" element={<TeamPage />} />

                {/* Auth required */}
                <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/quiz" element={<ProtectedRoute><CvGateRoute><QuizPage /></CvGateRoute></ProtectedRoute>} />
                <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
                <Route path="/assessments/:id" element={<ProtectedRoute><AssessmentResultPage /></ProtectedRoute>} />
                <Route path="/matcher" element={<ProtectedRoute><JobMatchPage /></ProtectedRoute>} />

                {/* Catch-all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
          </AuthProvider>
        </BrowserRouter>
        <Toaster />
        <Sonner />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
