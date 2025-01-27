import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export const SearchBar = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search movies..."
        className="w-full rounded-full bg-navy-light px-6 py-3 pr-12 text-white placeholder-gray-400 outline-none ring-gold focus:ring-2"
      />
      <button
        type="submit"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
      >
        <Search className="h-5 w-5" />
      </button>
    </form>
  );
};