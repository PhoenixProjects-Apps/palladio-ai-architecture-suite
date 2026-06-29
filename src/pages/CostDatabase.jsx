import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Plus, Trash2, Database, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function CostDatabase() {
    const [costs, setCosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [newState, setState] = useState('NSW');
    const [newCity, setCity] = useState('Sydney');
    const [newCategory, setCategory] = useState('');
    const [newItem, setItem] = useState('');
    const [newUnit, setUnit] = useState('sqm');
    const [newRate, setRate] = useState('');

    useEffect(() => {
        loadCosts();
    }, []);

    const loadCosts = async () => {
        setLoading(true);
        try {
            const data = await base44.entities.MaterialCost.list();
            setCosts(data);
        } catch(e) {
            toast.error("Failed to load database");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if(!newCategory || !newItem || !newRate) {
            toast.error("Please fill all required fields");
            return;
        }
        setIsSaving(true);
        const optimisticId = 'temp-' + Date.now();
        const optimisticItem = {
            id: optimisticId,
            state: newState,
            city: newCity,
            category: newCategory,
            item: newItem,
            unit: newUnit,
            rate: parseFloat(newRate),
            notes: ""
        };
        
        setCosts(prev => [optimisticItem, ...prev]);
        setCategory('');
        setItem('');
        setRate('');
        
        try {
            const added = await base44.entities.MaterialCost.create(optimisticItem);
            setCosts(prev => prev.map(c => c.id === optimisticId ? added : c));
            toast.success("Item added");
        } catch(e) {
            setCosts(prev => prev.filter(c => c.id !== optimisticId));
            toast.error("Failed to add item");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        const previousCosts = [...costs];
        setCosts(prev => prev.filter(c => c.id !== id));
        try {
            await base44.entities.MaterialCost.delete(id);
            toast.success("Item deleted");
        } catch(e) {
            setCosts(previousCosts);
            toast.error("Failed to delete item");
        }
    };

    return (
        <div className="min-h-screen bg-[#0f1117] text-white p-6 pb-12">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('PalladioEstimator')}>
                            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl">
                                <ArrowLeft size={20} />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2">
                                <Database className="text-blue-500" />
                                Australian Construction Cost DB
                            </h1>
                            <p className="text-slate-400 text-sm">Manage localized material and labor costs.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800 items-end">
                    <div className="col-span-1">
                        <label className="text-xs text-slate-400 mb-1 block">State</label>
                        <Select value={newState} onValueChange={setState}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 h-9"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                {['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs text-slate-400 mb-1 block">City</label>
                        <Input value={newCity} onChange={e => setCity(e.target.value)} className="bg-slate-800 border-slate-700 h-9" placeholder="e.g. Sydney" />
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs text-slate-400 mb-1 block">Category</label>
                        <Input value={newCategory} onChange={e => setCategory(e.target.value)} className="bg-slate-800 border-slate-700 h-9" placeholder="e.g. Framing" />
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs text-slate-400 mb-1 block">Item</label>
                        <Input value={newItem} onChange={e => setItem(e.target.value)} className="bg-slate-800 border-slate-700 h-9" placeholder="e.g. Timber" />
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs text-slate-400 mb-1 block">Unit</label>
                        <Select value={newUnit} onValueChange={setUnit}>
                            <SelectTrigger className="bg-slate-800 border-slate-700 h-9"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                {['sqm', 'lm', 'm3', 'item', 'hr'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="col-span-1">
                        <label className="text-xs text-slate-400 mb-1 block">Rate ($)</label>
                        <Input type="number" value={newRate} onChange={e => setRate(e.target.value)} className="bg-slate-800 border-slate-700 h-9" placeholder="0.00" />
                    </div>
                    <div className="col-span-1">
                        <Button onClick={handleAdd} disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-700 h-9">
                            {isSaving ? <Loader2 className="animate-spin w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />} Add
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-800/50" />)}
                    </div>
                ) : costs.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-900 rounded-xl border border-slate-800">No cost data found.</div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden sm:block bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-800/50">
                                    <TableRow className="border-slate-800">
                                        <TableHead className="text-slate-300">Location</TableHead>
                                        <TableHead className="text-slate-300">Category</TableHead>
                                        <TableHead className="text-slate-300">Item</TableHead>
                                        <TableHead className="text-slate-300">Rate</TableHead>
                                        <TableHead className="text-slate-300 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {costs.map(c => (
                                        <TableRow key={c.id} className="border-slate-800">
                                            <TableCell>{c.city}, {c.state}</TableCell>
                                            <TableCell>{c.category}</TableCell>
                                            <TableCell className="font-medium text-white">{c.item}</TableCell>
                                            <TableCell>${c.rate.toFixed(2)} / {c.unit}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-8 w-8">
                                                    <Trash2 size={14} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Mobile Cards */}
                        <div className="sm:hidden space-y-3">
                            {costs.map(c => (
                                <div key={c.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col gap-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-white text-lg">{c.item}</div>
                                            <div className="text-sm text-slate-400">{c.category} &middot; {c.city}, {c.state}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-white font-medium text-lg">${c.rate.toFixed(2)}</div>
                                            <div className="text-xs text-slate-400">per {c.unit}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-2 border-t border-slate-800">
                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 h-9 px-3">
                                            <Trash2 size={16} className="mr-2" /> Delete
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}