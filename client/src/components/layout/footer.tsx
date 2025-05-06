export function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
      <div className="container mx-auto px-4 text-center text-sm text-gray-600">
        <p>© {currentYear} San Francisco Zoo Docent Program. All rights reserved.</p>
        <p className="mt-1">For help or support, contact your program coordinator.</p>
      </div>
    </footer>
  );
}
