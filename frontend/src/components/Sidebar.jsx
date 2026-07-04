import { NavLink } from "react-router-dom";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Upload" },
  { to: "/arquivos", label: "Arquivos" },
  { to: "/resumos", label: "Resumos" },
  { to: "/perfil", label: "Perfil" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <div>
        <p className="eyebrow">Documentos e IA</p>
        <h2>CoreText</h2>
        <p className="sidebar-text">Navegação principal da aplicação.</p>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `sidebar-link${isActive ? " active" : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;