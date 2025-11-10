import { OrbField } from '@/components/landing/OrbField'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center min-w-screen">
      <OrbField />

      <div className="max-w-2xl text-center p-8">
        <h1 className="text-6xl font-extrabold mb-4">404</h1>
        <p className="text-xl text-gray-300 mb-6">Page not found.</p>
      </div>
    </div>
  );
}
