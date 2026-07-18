// VeriCV Landing Page - now handled by LandingPage component

import LandingPage from "./LandingPage";
import { login, register, uploadCV, getFeedback, generateQuiz, submitQuiz } from "@/api/endpoints";


const Index = () => {
  return <LandingPage />;
};

export default Index;
