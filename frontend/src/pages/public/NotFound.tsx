import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';

export function NotFoundPage(): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 py-12">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">404</p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">Page not found</h1>
        <p className="mt-2 text-base text-gray-500">Sorry, we couldn't find the page you're looking for.</p>
        <Link to="/" className="mt-6 inline-block">
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  );
}
