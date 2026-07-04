import { useNavigate } from "react-router-dom";

function Header() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("coretext-token");
    navigate("/login");
  };

  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">CoreText</p>
        <h1 className="topbar-title">Painel da aplicação</h1>
      </div>

      <div className="topbar-actions">
        <span className="status-pill">Área interna</span>
        <button type="button" className="ghost-button" onClick={handleLogout}>
          Sair
        </button>
      </div>
    </header>
  );
}

export default Header;