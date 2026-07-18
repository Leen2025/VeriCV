import { Navigate, useLocation } from "react-router-dom";
import { isAuthenticated, hasUploadedCV } from "@/utils/auth";

export default function ProtectedRoute({
  children,
  requireCv = false,
}: {
  children: JSX.Element;
  requireCv?: boolean;
}) {
  const authed = isAuthenticated();
  const cvOk = hasUploadedCV();
  const location = useLocation();

  if (!authed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (requireCv && !cvOk) {
    return <Navigate to="/upload" replace />;
  }

  return children;
}
