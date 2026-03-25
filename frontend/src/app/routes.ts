import { createBrowserRouter } from "react-router";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import ForgotPasswordPage from "./pages/forgot-password";
import DashboardPage from "./pages/dashboard";
import ProfilePage from "./pages/profile";
import EditProfilePage from "./pages/edit-profile";
import AgentPage from "./pages/agent";
import AuthLayout from "./layouts/auth-layout";
import DashboardLayout from "./layouts/dashboard-layout";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AuthLayout,
    children: [
      { index: true, Component: LoginPage },
      { path: "register", Component: RegisterPage },
      { path: "forgot-password", Component: ForgotPasswordPage },
    ],
  },
  {
    path: "/app",
    Component: DashboardLayout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "profile", Component: ProfilePage },
      { path: "profile/edit", Component: EditProfilePage },
      { path: "agent", Component: AgentPage },
    ],
  },
]);
