import { Outlet, Link } from "react-router-dom";

function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>CoreText</h2>

        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/arquivos">Arquivos</Link>
          <Link to="/resumos">Resumos</Link>
          <Link to="/perfil">Perfil</Link>
        </nav>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;