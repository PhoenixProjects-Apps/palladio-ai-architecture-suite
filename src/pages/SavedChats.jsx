import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, Plus, Loader2, Trash2, List } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import MessageBubble from '@/components/MessageBubble';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import PalladioGate from '@/components/PalladioGate';
import SaveToProject from '@/components/SaveToProject';
import { toast } from 'sonner';

export default function SavedChats() {
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState(() => sessionStorage.getItem('saved-chat-draft') || '');
  useEffect(() => { sessionStorage.setItem('saved-chat-draft', input); }, [input]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    loadConversations();
    base44.auth.me().then(u => setIsAdmin(u?.role === 'admin')).catch(() => {});
  }, []);

  usePullToRefresh(async () => { await loadConversations(); });

  const loadConversations = async () => {
    try {
      const convos = await base44.entities.SuperagentChat.list('-updated_date', 50);
      setConversations(convos || []);

      const searchParams = new URLSearchParams(window.location.search);
      const urlConvId = searchParams.get('convId');

      if (urlConvId && convos.find(c => c.id === urlConvId)) {
        selectConversation(convos.find(c => c.id === urlConvId));
      } else if (convos.length > 0 && !activeChat) {
        selectConversation(convos[0]);
      } else if (convos.length === 0) {
        handleNewChat();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectConversation = (chat) => {
    setActiveChat(chat);
    setMessages(chat.messages || []);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 100);
  };

  const handleNewChat = async () => {
    setIsLoading(true);
    try {
      const chat = await base44.entities.SuperagentChat.create({
        title: "New Discussion",
        session_id: "",
        messages: []
      });
      setActiveChat(chat);
      setMessages([]);
      await loadConversations();
    } catch (e) {
      console.error(e);
      toast.error("Could not start a new chat.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteChat = async (id) => {
    try {
      await base44.entities.SuperagentChat.delete(id);
      if (activeChat?.id === id) {
        setActiveChat(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (e) {
      console.error(e);
      toast.error("Could not delete chat.");
    }
  };

  const buildChatMarkdown = () => {
    if (!messages.length) return '';
    const title = activeChat?.title || 'AI Assistant Chat';
    const lines = [`# ${title}`, ''];
    messages.forEach(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      lines.push(`**${role}:**`, '', m.content || '', '');
    });
    return lines.join('\n').trim();
  };

  const chatFileName = (() => {
    const name = activeChat?.title || 'chat';
    return name.replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.md';
  })();

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeChat || isLoading) return;
    const text = input;
    setInput('');
    setIsLoading(true);

    const userMsg = { role: 'user', content: text };
    const pendingMessages = [...messages, userMsg];
    setMessages(pendingMessages);
    scrollToBottom();

    try {
      const res = await base44.functions.invoke('superagentInvoke', {
        input: text,
        sessionId: activeChat.session_id || ""
      });

      const output = res.data?.output;
      const newSessionId = res.data?.session_id || activeChat.session_id || "";

      if (res.data?.error || !output) {
        throw new Error(res.data?.error || "No response from superagent.");
      }

      const assistantMsg = { role: 'assistant', content: output };
      const updatedMessages = [...pendingMessages, assistantMsg];
      setMessages(updatedMessages);

      const shouldRename = !activeChat.title || activeChat.title === "New Discussion";
      const newTitle = shouldRename
        ? (text.substring(0, 30) + (text.length > 30 ? '...' : ''))
        : activeChat.title;

      await base44.entities.SuperagentChat.update(activeChat.id, {
        messages: updatedMessages,
        session_id: newSessionId,
        title: newTitle
      });

      setActiveChat({ ...activeChat, session_id: newSessionId, title: newTitle, messages: updatedMessages });
      await loadConversations();
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Failed to get a response.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PalladioGate>
      <div className="flex flex-1 w-full bg-[#0f1117] text-slate-200">

        {/* Sidebar */}
        <div className="w-80 border-r border-slate-800 bg-[#0a0c10] flex flex-col hidden md:flex">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-indigo-400" />
              AI Assistant
            </h2>
            <Button aria-label="New" onClick={handleNewChat} variant="ghost" size="icon" className="hover:bg-slate-800 text-slate-400">
              <Plus size={18} />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-1">
              {conversations.map(c => (
                <div
                  key={c.id}
                  className={cn(
                    "group w-full flex items-center text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 truncate",
                    activeChat?.id === c.id
                      ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                  )}
                >
                  <button onClick={() => selectConversation(c)} className="flex-1 truncate text-left">
                    {c.title || "New Discussion"}
                  </button>
                  <button
                    onClick={() => handleDeleteChat(c.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 ml-2 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center p-2"
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-8">No chats yet</p>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col relative bg-[#0f1117]">
          {/* Mobile Header */}
          <div className="md:hidden p-4 border-b border-slate-800 flex justify-between items-center bg-[#0a0c10]">
            <div className="flex items-center gap-2">
              <Drawer>
                <DrawerTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white mr-1 -ml-2">
                    <List size={20} />
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-[#0a0c10] border-slate-800 text-white max-h-[85vh]">
                  <DrawerHeader className="text-left border-b border-slate-800 pb-4">
                    <DrawerTitle>Your Chats</DrawerTitle>
                  </DrawerHeader>
                  <ScrollArea className="p-4 overflow-y-auto">
                    <div className="space-y-1 pb-8">
                      {conversations.map(c => (
                        <div
                          key={c.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg text-sm transition-all group",
                            activeChat?.id === c.id ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30" : "hover:bg-slate-800/50 text-slate-200 border border-transparent"
                          )}
                        >
                          <button onClick={() => selectConversation(c)} className="flex-1 truncate text-left">
                            {c.title || "New Discussion"}
                          </button>
                          <button
                            onClick={() => handleDeleteChat(c.id)}
                            className="text-slate-500 hover:text-red-400 ml-2 shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center p-2"
                            title="Delete chat"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      {conversations.length === 0 && (
                        <p className="text-slate-500 text-sm text-center py-8">No chats yet</p>
                      )}
                    </div>
                  </ScrollArea>
                </DrawerContent>
              </Drawer>
              <h2 className="font-semibold text-white">AI Assistant</h2>
            </div>
            <div className="flex items-center gap-2">
              <SaveToProject textContent={buildChatMarkdown()} fileName={chatFileName} assetType="document" disabled={!activeChat || !messages.length} variant="outline" size="sm" className="bg-slate-800 border-slate-700 text-slate-300 h-8 text-xs">
                Save to Project
              </SaveToProject>
              <Button onClick={handleNewChat} variant="outline" size="sm" className="bg-slate-800 border-slate-700">
                <Plus size={16} className="mr-2" /> New
              </Button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:flex justify-end items-center p-3 border-b border-slate-800 bg-[#0a0c10]">
            <SaveToProject textContent={buildChatMarkdown()} fileName={chatFileName} assetType="document" disabled={!activeChat || !messages.length} variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700">
              Save to Project
            </SaveToProject>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 p-4 md:p-8 space-y-6 pb-32"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                <MessageSquare size={48} className="mb-4 text-indigo-500" />
                <h3 className="text-xl font-medium text-white mb-2">How can I help?</h3>
                <p className="max-w-sm text-slate-400">Ask me about architecture, planning codes, or specific property details.</p>
              </div>
            )}
            {messages.map((m, i) => (
              <MessageBubble key={i} message={m} showToolCalls={isAdmin} />
            ))}
          </div>

          <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+64px)] md:bottom-0 left-0 right-0 p-4 z-10 bg-gradient-to-t from-[#0f1117] via-[#0f1117] to-transparent pt-12">
            <div className="max-w-3xl mx-auto">
              <form
                onSubmit={handleSend}
                className="relative flex items-center bg-slate-800/80 border border-slate-700 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about planning codes, structural ideas, or property info..."
                  className="flex-1 border-0 bg-transparent text-slate-200 placeholder:text-slate-500 h-14 px-5 focus-visible:ring-0 text-base"
                  disabled={isLoading}
                />
                <Button aria-label="Send Message"
                  type="submit"
                  disabled={!input.trim() || isLoading || !activeChat}
                  size="icon"
                  className="mr-2 h-10 w-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all shrink-0"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </PalladioGate>
  );
}