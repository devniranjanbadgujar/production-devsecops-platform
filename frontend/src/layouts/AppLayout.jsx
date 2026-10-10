import { Link, Outlet } from 'react-router-dom';

export default function AppLayout() {
  return (
    <>
      <header>
        <nav aria-label="Main navigation">
          <Link to="/">DevSecOps Platform</Link>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer>
        <p>Production DevSecOps Platform</p>
      </footer>
    </>
  );
}