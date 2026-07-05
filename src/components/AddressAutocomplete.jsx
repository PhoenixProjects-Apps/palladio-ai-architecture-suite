import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function AddressAutocomplete({ value, onChange, onSelect }) {
    const [query, setQuery] = useState(value || '');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const timeoutRef = useRef(null);
    const containerRef = useRef(null);
    const skipNextRef = useRef(false);

    useEffect(() => {
        if (skipNextRef.current) {
            skipNextRef.current = false;
            return;
        }
        if (!query || query.length < 3) {
            setResults([]);
            setOpen(false);
            return;
        }
        setLoading(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=8&countrycodes=au`);
                const data = await res.json();
                // Nominatim drops the house number when the exact number isn't
                // mapped in OSM (it falls back to a street-level match). Preserve
                // the leading number the user typed so it isn't lost from the
                // suggestion.
                const typedNumber = (query.match(/^\s*(\d+[A-Za-z]?)/) || [])[1];
                const features = (data || []).map(r => {
                    let display_name = r.display_name;
                    if (!r.address?.house_number && typedNumber) {
                        display_name = `${typedNumber}, ${r.display_name}`;
                    }
                    return { display_name, lat: r.lat, lon: r.lon };
                }).filter(r => r.display_name);
                setResults(features);
                setOpen(true);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        document.addEventListener('touchstart', handler);
        return () => {
            document.removeEventListener('mousedown', handler);
            document.removeEventListener('touchstart', handler);
        };
    }, []);

    const isOpen = open && results.length > 0;
    return (
        <div className="relative" ref={containerRef}>
            <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="address-listbox"
                    aria-autocomplete="list"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        onChange?.(e.target.value);
                    }}
                    onFocus={() => { if (results.length > 0) setOpen(true); }}
                    placeholder="Start typing an address..."
                    className="pl-10 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl h-12"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" size={18} />}
            </div>
            {isOpen && (
                <div id="address-listbox" role="listbox" className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto">
                    {results.map((r, i) => (
                        <div 
                            key={i} 
                            role="option"
                            aria-selected={query === r.display_name}
                            className="p-3 hover:bg-slate-800 cursor-pointer text-sm text-slate-200 border-b border-slate-800 last:border-0"
                            onClick={() => {
                                skipNextRef.current = true;
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