import { Link, Outlet } from 'react-router-dom';

export function AuthShell(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-bold">F</div>
            <span className="text-base font-semibold text-gray-900">FormNest</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <Outlet />
      </main>
    </div>
  );
}
