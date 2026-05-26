import { Link, Outlet } from 'react-router-dom';

export function PublicShell(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">F</div>
            <span className="text-base font-semibold text-gray-900">FormNest</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-gray-700">
            <Link to="/pricing" className="hover:text-gray-900">Pricing</Link>
            <Link to="/login" className="hover:text-gray-900">Login</Link>
            <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700">Sign up</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-gray-100">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} FormNest. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
