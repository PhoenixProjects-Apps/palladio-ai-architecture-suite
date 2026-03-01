import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AddressAutocomplete({ value, onChange, onSelect }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        if (query === value && !open) return;
        if (!query) {
            setResults([]);
            return;
        }
        setLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&countrycodes=au`);
                const data = await res.json();
                setResults(data);
                setOpen(true);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 350);
    }, [query]);

    return (
        <div className="relative">
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        onChange?.(e.target.value);
                    }}
                    placeholder="Enter an address..."
                    className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl h-12"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={18} />}
            </div>
            {open && results.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {results.map((r, i) => (
                        <div 
                            key={i} 
                            className="p-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-200 border-b border-slate-800 last:border-0"
                            onClick={() => {
                                setQuery(r.display_name);
                                setOpen(false);
                                onSelect?.(r.display_name);
                            }}
                        >
                            {r.display_name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}