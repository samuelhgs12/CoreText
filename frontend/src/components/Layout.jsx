import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Icon from "./Icon";
import ThemeToggle from "./ThemeToggle";

function Layout() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("coretext-token");
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
            <button type="button" className="topbar-icon-button" aria-label="Notificações">
              <Icon name="bell" size={22} />
            </button>
            <span className="avatar-small">K</span>
            <strong>Kayke</strong>
            <Icon name="chevronDown" size={18} />
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
