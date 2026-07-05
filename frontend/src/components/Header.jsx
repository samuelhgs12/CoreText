import { useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../services/authService";
import ThemeToggle from "./ThemeToggle";

function Header() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">CoreText</p>
        <h1 className="topbar-title">Painel da aplicação</h1>
      </div>

      <div className="topbar-actions">
        <ThemeToggle />
        <span className="status-pill">{currentUser?.name || "Área interna"}</span>
        <button type="button" className="ghost-button" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}

export default Header;
