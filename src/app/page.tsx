"use client";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"white" | "formal">("white");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);
    setImage(null);
    setError(null);
    if (!file) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("mode", mode);

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResult(data.message || "Success");
        if (data.image) setImage(data.image);
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 py-16 px-4 bg-white dark:bg-black">
        <h1 className="text-2xl font-bold mb-4 text-black dark:text-zinc-50">
          Rush ID Generator
        </h1>
        <form
          className="flex flex-col gap-6 w-full"
          onSubmit={handleSubmit}
        >
          <div>
            <label className="block mb-2 font-medium text-zinc-700 dark:text-zinc-200">
              Upload Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-zinc-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"
              required
            />
            {file && (
              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                Selected: {file.name}
              </div>
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium text-zinc-700 dark:text-zinc-200">
              Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value="white"
                  checked={mode === "white"}
                  onChange={() => setMode("white")}
                  className="accent-zinc-700"
                />
                White Background
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="mode"
                  value="formal"
                  checked={mode === "formal"}
                  onChange={() => setMode("formal")}
                  className="accent-zinc-700"
                />
                Formal Attire
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-yellow-500 py-3 px-6 text-white font-semibold hover:bg-yellow-600 transition-colors disabled:opacity-50"
            disabled={!file || loading}
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </form>
        {result && (
          <div className="mt-4 text-green-700 bg-green-100 rounded p-2 w-full text-center">
            {result}
          </div>
        )}
        {image && (
          <div className="mt-4 flex flex-col items-center gap-2 w-full">
            <img
              src={image}
              alt="Generated 2x2 ID"
              className="w-48 h-48 object-cover border border-zinc-300 rounded shadow"
            />
            <a
              href={image}
              download="rush-id-2x2.jpg"
              className="mt-2 inline-block rounded bg-yellow-500 px-4 py-2 text-white font-semibold hover:bg-yellow-600 transition-colors"
            >
              Download 2x2 ID
            </a>
          </div>
        )}
        {error && (
          <div className="mt-4 text-red-700 bg-red-100 rounded p-2 w-full text-center">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}