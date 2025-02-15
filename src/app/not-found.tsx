export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          404 - Not Found
        </h1>
        <p className="text-gray-600 mb-4">
          The page you are looking for does not exist.
        </p>
        <a
          href="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}
