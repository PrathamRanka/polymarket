"use client";

import React, { useState } from "react";

interface AdminMarketRow {
  id: string;
  title: string;
  status: string;
  yes_volume: number | string;
  no_volume: number | string;
  expires_at: string;
  image_url?: string | null;
}

interface Props {
  categories: { id: string; name: string }[];
  markets?: AdminMarketRow[];
}

export default function AdminControls({ categories }: Props) {
  const [markets, setMarkets] = useState<Props["markets"]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories?.[0]?.id ?? "");
  const [expiresAt, setExpiresAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [imageInputs, setImageInputs] = useState<Record<string, string>>({});

  async function createMarket(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setMessage(null);

    try {
      const res = await fetch("/api/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, category_id: category, expires_at: expiresAt, image_url: imageUrl || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Failed");
      setMessage("Market created successfully");
      setTitle("");
      setDescription("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setCreating(false);
    }
  }

  async function uploadImage(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      try {
        const res = await fetch("/api/admin/upload-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, base64 }),
        });
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error ?? "Upload failed");
        setImageUrl(payload?.publicUrl ?? "");
        setMessage("Image uploaded");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setMessage(msg);
      }
    };
    reader.readAsDataURL(file);
  }

  async function createInitialAdmin() {
    setMessage(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/create-initial-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "pratham@gmail.com", password: "07896811Pp@" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? data?.message ?? "Failed");
      setMessage("Admin created/ensured: " + data?.email);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setCreating(false);
    }
  }

  // load markets on mount (client-side refreshable list)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/markets?limit=50");
        const payload = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setMessage(`Error loading markets: ${payload?.error ?? "Unknown error"}`);
          return;
        }
        const fetched = payload?.data ?? [];
        setMarkets(fetched);
        // initialize image input values from fetched markets
        const inputs: Record<string, string> = {};
        (fetched ?? []).forEach((m: AdminMarketRow) => {
          inputs[m.id] = m.image_url ?? "";
        });
        setImageInputs(inputs);
      } catch (err) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setMessage(`Failed to load markets: ${msg}`);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function closeAndResolve(marketId: string, side: "YES" | "NO") {
    setMessage(null);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: marketId, winning_side: side }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? payload?.message ?? "Resolve failed");

      // optimistic update: mark market resolved in list
      setMarkets((prev) => prev?.map((m) => (m.id === marketId ? { ...m, status: "RESOLVED" } : m)));
      setMessage("Market resolved — realtime updates will propagate to clients.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setCreating(false);
    }
  }

  async function updateMarketImage(marketId: string) {
    setMessage(null);
    setCreating(true);
    try {
      const image_url = imageInputs[marketId] ?? "";
      const res = await fetch("/api/admin/update-market-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: marketId, image_url }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload?.error ?? payload?.message ?? "Update failed");

      // update local list
      setMarkets((prev) => prev?.map((m) => (m.id === marketId ? { ...m, image_url: image_url } : m)));
      setMessage("Market image updated");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={createMarket} className="space-y-2">
        <div>
          <label className="text-sm text-zinc-300">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded bg-zinc-800 p-2 text-zinc-100" />
        </div>
        <div>
          <label className="text-sm text-zinc-300">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded bg-zinc-800 p-2 text-zinc-100" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-sm text-zinc-300">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded bg-zinc-800 p-2 text-zinc-100">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-sm text-zinc-300">Expires At</label>
            <input value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} type="datetime-local" className="w-full rounded bg-zinc-800 p-2 text-zinc-100" />
          </div>
        </div>
        <div>
          <label className="text-sm text-zinc-300">Optional Image</label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input type="file" accept="image/*" onChange={(e) => uploadImage(e.target.files?.[0] ?? null)} className="w-full text-zinc-100" />
            </div>
            <div className="flex-1">
              <input
                type="text"
                placeholder="Or paste image URL (Cloudinary, etc.)"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded bg-zinc-800 p-2 text-zinc-100"
              />
            </div>
          </div>
          {imageUrl && <p className="text-xs text-zinc-400 mt-1">Image: {imageUrl}</p>}
        </div>
        <div>
          <button disabled={creating} className="rounded bg-emerald-600 px-4 py-2 text-white">
            {creating ? "Creating…" : "Create Market"}
          </button>
        </div>
      </form>

      <div className="pt-6 border-t border-zinc-800">
        <h3 className="text-sm font-medium text-zinc-200">Existing Markets</h3>
        <div className="mt-3 space-y-2">
          {(markets ?? []).map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 rounded bg-zinc-900/40 p-2">
              <div className="truncate text-zinc-200">{m.title}</div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-zinc-400">{m.status}</div>
                <select id={`side-${m.id}`} defaultValue="YES" className="rounded bg-zinc-800 p-1 text-zinc-100 text-xs">
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    const sel = document.getElementById(`side-${m.id}`) as HTMLSelectElement | null;
                    const side = (sel?.value ?? "YES") as "YES" | "NO";
                    if (!confirm(`Resolve market \"${m.title}\" as ${side}? This will pay out winners.`)) return;
                    await closeAndResolve(m.id, side);
                  }}
                  className="rounded bg-red-600 px-2 py-1 text-xs text-white"
                >
                  Close & Resolve
                </button>

                <input
                  type="text"
                  placeholder="Paste Cloudinary URL here"
                  value={imageInputs[m.id] ?? ""}
                  onChange={(e) => setImageInputs((s) => ({ ...s, [m.id]: e.target.value }))}
                  className="w-64 rounded bg-zinc-800 p-1 text-xs text-zinc-100"
                />
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!confirm(`Update image for \"${m.title}\"?`)) return;
                    await updateMarketImage(m.id);
                  }}
                  className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                >
                  Update Image
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-zinc-800">
        <button onClick={createInitialAdmin} className="rounded bg-blue-600 px-4 py-2 text-white">
          Ensure Admin User (pratham@gmail.com)
        </button>
      </div>

      {message && <p className="text-sm text-zinc-300">{message}</p>}
    </div>
  );
}
