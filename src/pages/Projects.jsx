import React, { useState, useEffect } from 'react';
import { Folder, Plus, File, MessageSquare, Trash2, ArrowLeft, Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import PalladioGate from '@/components/PalladioGate';
import { toast } from 'sonner';

export default function Projects() {
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [newProjectName, setNewProjectName] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [assets, setAssets] = useState([]);
    const [chats, setChats] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        setIsLoading(true);
        try {
            const user = await base44.auth.me();
            if (!user) return;
            // Fetch all projects for this user
            const data = await base44.entities.Project.filter({ created_by: user.email }, '-created_date', 100);
            setProjects(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;
        try {
            const newProj = await base44.entities.Project.create({ name: newProjectName.trim() });
            setProjects([newProj, ...projects]);
            setNewProjectName('');
            setIsCreateOpen(false);
            toast.success("Project created successfully");
        } catch (e) {
            toast.error("Failed to create project");
        }
    };

    const handleDeleteProject = async (e, id) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this project?')) return;
        try {
            await base44.entities.Project.delete(id);
            setProjects(projects.filter(p => p.id !== id));
            if (selectedProject?.id === id) setSelectedProject(null);
            toast.success("Project deleted");
        } catch (e) {
            toast.error("Failed to delete project");
        }
    };

    const openProject = async (project) => {
        setSelectedProject(project);
        loadProjectDetails(project.id);
    };

    const loadProjectDetails = async (projectId) => {
        try {
            const [assetData, convos] = await Promise.all([
                base44.entities.ProjectAsset.filter({ project_id: projectId }, '-created_date', 100),
                base44.agents.listConversations({ agent_name: "architecture_assistant" })
            ]);
            setAssets(assetData || []);
            setChats((convos || []).filter(c => c.metadata?.project_id === projectId));
        } catch (e) {
            console.error(e);
        }
    };

    const handleUploadFile = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedProject) return;
        setIsUploading(true);
        try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            const newAsset = await base44.entities.ProjectAsset.create({
                project_id: selectedProject.id,
                file_name: file.name,
                file_url,
                asset_type: 'other'
            });
            setAssets([newAsset, ...assets]);
            toast.success("File uploaded to project");
        } catch (err) {
            toast.error("Upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteAsset = async (id) => {
        if (!confirm('Delete this file?')) return;
        try {
            await base44.entities.ProjectAsset.delete(id);
            setAssets(assets.filter(a => a.id !== id));
            toast.success("File removed");
        } catch (e) {
            toast.error("Failed to delete file");
        }
    };

    const handleNewChat = async () => {
        try {
            const conv = await base44.agents.createConversation({
                agent_name: "architecture_assistant",
                metadata: { name: "New Project Discussion", project_id: selectedProject.id }
            });
            navigate(createPageUrl(`SavedChats?convId=${conv.id}`));
        } catch (e) {
            toast.error("Failed to create chat");
        }
    };

    const openChat = (convId) => {
        navigate(createPageUrl(`SavedChats?convId=${convId}`));
    };

    if (isLoading) {
        return <div className="flex-1 flex items-center justify-center bg-[#0f1117] h-screen"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;
    }

    if (selectedProject) {
        return (
            <PalladioGate>
                <div className="min-h-screen bg-[#0f1117] text-white p-6 md:p-10">
                    <div className="max-w-5xl mx-auto">
                        <button onClick={() => setSelectedProject(null)} className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors">
                            <ArrowLeft size={20} /> Back to Projects
                        </button>
                        
                        <div className="flex items-center justify-between mb-8">
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Folder className="text-amber-500" size={32} />
                                {selectedProject.name}
                            </h1>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Assets Section */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        <File className="text-cyan-400" size={20} /> Project Files
                                    </h2>
                                    <div>
                                        <input type="file" id="file-upload" className="hidden" onChange={handleUploadFile} disabled={isUploading} />
                                        <label htmlFor="file-upload" className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition flex items-center gap-2">
                                            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                            Upload
                                        </label>
                                    </div>
                                </div>
                                
                                {assets.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-sm">No files uploaded yet.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {assets.map(asset => (
                                            <div key={asset.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-white/5">
                                                <a href={asset.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:text-cyan-400 transition-colors truncate pr-4">
                                                    <File size={16} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate text-sm">{asset.file_name}</span>
                                                </a>
                                                <button onClick={() => handleDeleteAsset(asset.id)} className="text-slate-500 hover:text-red-400 p-1">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Chats Section */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-semibold flex items-center gap-2">
                                        <MessageSquare className="text-indigo-400" size={20} /> AI Discussions
                                    </h2>
                                    <Button onClick={handleNewChat} variant="outline" size="sm" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-white">
                                        <Plus size={16} className="mr-2" /> New Chat
                                    </Button>
                                </div>
                                
                                {chats.length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-sm">No chats assigned to this project.</div>
                                ) : (
                                    <div className="space-y-3">
                                        {chats.map(chat => (
                                            <div key={chat.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-white/5 hover:bg-slate-700 transition-colors cursor-pointer" onClick={() => openChat(chat.id)}>
                                                <div className="flex items-center gap-3 truncate pr-4">
                                                    <MessageSquare size={16} className="text-slate-400 flex-shrink-0" />
                                                    <span className="truncate text-sm text-slate-200">{chat.metadata?.name || "Discussion"}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </PalladioGate>
        );
    }

    return (
        <PalladioGate>
            <div className="min-h-screen bg-[#0f1117] text-white p-6 md:p-10">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center justify-between mb-10">
                        <h1 className="text-3xl font-bold flex items-center gap-3">
                            <Folder className="text-amber-500" size={32} />
                            Projects
                        </h1>
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">
                                    <Plus size={18} className="mr-2" /> New Project
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#1a1d24] border-white/10 text-white shadow-2xl">
                                <DialogHeader>
                                    <DialogTitle>Create New Project</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleCreateProject} className="space-y-4 mt-4">
                                    <Input 
                                        value={newProjectName} 
                                        onChange={e => setNewProjectName(e.target.value)} 
                                        placeholder="E.g. Smith Residence..." 
                                        className="bg-[#0f1117] border-white/10 text-white focus-visible:ring-amber-500/50 h-12"
                                        autoFocus
                                    />
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button type="button" variant="ghost" onClick={() => setIsCreateOpen(false)} className="hover:bg-white/5 hover:text-white">Cancel</Button>
                                        <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white" disabled={!newProjectName.trim()}>Create Project</Button>
                                    </div>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>

                    {projects.length === 0 ? (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
                            <Folder className="w-16 h-16 text-slate-500 mx-auto mb-6 opacity-40" />
                            <h2 className="text-2xl font-semibold text-white mb-3">No projects yet</h2>
                            <p className="text-slate-400 max-w-sm mx-auto mb-6">Create a project folder to organize your plans, 3D renders, and architecture AI discussions.</p>
                            <Button onClick={() => setIsCreateOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl">Create your first project</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {projects.map(project => (
                                <div 
                                    key={project.id} 
                                    onClick={() => openProject(project)}
                                    className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all cursor-pointer group relative hover:border-amber-500/30 shadow-lg"
                                >
                                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center mb-5">
                                        <Folder className="text-amber-500" size={24} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2 truncate">{project.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium">Created {new Date(project.created_date).toLocaleDateString()}</p>
                                    
                                    <button 
                                        onClick={(e) => handleDeleteProject(e, project.id)}
                                        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        title="Delete Project"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PalladioGate>
    );
}