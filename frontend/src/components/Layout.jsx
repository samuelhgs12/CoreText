import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";
import { getCurrentUser, logout } from "../services/authService";

function Layout() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const userInitial = currentUser?.name?.trim()?.[0]?.toUpperCase() || "K";

  useEffect(() => {
    function handleUserUpdated() {
      setCurrentUser(getCurrentUser());
    }

    window.addEventListener("coretext:user-updated", handleUserUpdated);
    window.addEventListener("storage", handleUserUpdated);

    return () => {
      window.removeEventListener("coretext:user-updated", handleUserUpdated);
      window.removeEventListener("storage", handleUserUpdated);
    };
  }, []);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            <div className="logo-box" aria-hidden="true">
              <span className="logo-page">
                <span className="logo-fold" />
                <span className="logo-line logo-line-long" />
                <span className="logo-line" />
                <span className="logo-line logo-line-short" />
              </span>
            </div>
            <strong>CoreText</strong>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/dashboard" className="sidebar-link">
              <Icon name="home" className="sidebar-icon" />
              Dashboard
            </NavLink>

            <NavLink to="/upload" className="sidebar-link">
              <Icon name="cloudUpload" className="sidebar-icon" />
              Upload
            </NavLink>

            <NavLink to="/arquivos" className="sidebar-link">
              <Icon name="folder" className="sidebar-icon" />
              Arquivos
            </NavLink>

            <NavLink to="/resumos" className="sidebar-link">
              <Icon name="fileText" className="sidebar-icon" />
              Resumos
            </NavLink>

            <NavLink to="/perfil" className="sidebar-link">
              <Icon name="user" className="sidebar-icon" />
              Perfil
            </NavLink>

            <button type="button" className="sidebar-link" onClick={handleLogout}>
              <Icon name="logOut" className="sidebar-icon" />
              Sair
            </button>
          </nav>
        </div>

      </aside>

      <div className="content-column">
        <header className="topbar">
          <div className="topbar-actions">
            <ThemeToggle />
            <span className="avatar-small">
              {currentUser?.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="Foto de perfil" />
              ) : (
                userInitial
              )}
            </span>
            <strong>{currentUser?.name || "Kayke"}</strong>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
