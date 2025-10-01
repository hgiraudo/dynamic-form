import React from "react";

function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-brand-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Form</h1>
          <nav className="space-x-6">
            <a href="/" className="hover:underline">
              Inicio
            </a>
            <a href="/wizard" className="hover:underline">
              Wizard
            </a>
            <a href="/about" className="hover:underline">
              Acerca de
            </a>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-6 mt-10">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <span>
            © {new Date().getFullYear()} Todos los derechos reservados.
          </span>
          <div className="space-x-4">
            <a href="/privacy" className="hover:underline">
              Privacidad
            </a>
            <a href="/terms" className="hover:underline">
              Términos
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
