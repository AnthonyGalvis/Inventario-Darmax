import React, { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Error al iniciar sesión");
      return;
    }

    localStorage.setItem("token", data.token);
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-neutral-900 overflow-hidden">

      {/* Marca de agua */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5">
        <img
          src="/logo.png"
          alt="Darmax Logo"
          className="w-2/3 max-w-2xl"
        />
      </div>

      <div className="relative bg-white p-10 rounded-2xl shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Iniciar Sesión
        </h2>

        {error && (
          <div className="mb-4 text-red-500 text-sm">{error}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="text"
            placeholder="Usuario"
            className="w-full px-4 py-2 border rounded-xl"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full px-4 py-2 border rounded-xl"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            className="w-full bg-black text-white py-2 rounded-xl font-bold"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}

