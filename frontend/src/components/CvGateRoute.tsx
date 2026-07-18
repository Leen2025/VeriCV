import { Navigate } from "react-router-dom";
import { hasUploadedCV } from "@/utils/auth";

export default function CvGateRoute({ children }: { children: JSX.Element }) {
  if (!hasUploadedCV()) {
    return <Navigate to="/upload" replace />;
  }
  return children;
}
