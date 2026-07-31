import React, { useState } from "react";
import "./styles.css";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { useAuth } from "./hooks/useAuth";
import type { MemberSession } from "./api";

type Route = "login" | "register" | "forgot";

export function App() {
  const { session, saveSession, clearSession, isLoggedIn } = useAuth();
  const [route, setRoute] = useState<Route>("login");

  function handleLogin(s: MemberSession) {
    saveSession(s);
  }

  function handleRegister(s: MemberSession) {
    saveSession(s);
  }

  if (isLoggedIn && session) {
    return (
      <DashboardPage
        businessName={session.businessName}
        onLogout={clearSession}
      />
    );
  }

  if (route === "register") {
    return (
      <RegisterPage
        onRegister={handleRegister}
        onGoLogin={() => setRoute("login")}
      />
    );
  }

  if (route === "forgot") {
    return (
      <ForgotPasswordPage
        onGoLogin={() => setRoute("login")}
      />
    );
  }

  return (
    <LoginPage
      onLogin={handleLogin}
      onGoRegister={() => setRoute("register")}
      onGoForgot={() => setRoute("forgot")}
    />
  );
}
