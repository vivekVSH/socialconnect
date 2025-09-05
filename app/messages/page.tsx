'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';

interface Conversation {
  id: string;
  other_user: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    avatar_url: string;
  };
  last_message: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const sb = supabaseBrowser();
      
      // Get conversations where user is either sender or receiver
      const { data, error } = await sb
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          created_at,
          profiles!messages_sender_id_fkey (
            id,
            username,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();
      
      (data as any)?.forEach((message: any) => {
        const otherUserId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        const otherUser = message.sender_id === user.id 
          ? message.profiles 
          : { 
              id: otherUserId,
              username: 'Unknown',
              first_name: '',
              last_name: '',
              avatar_url: null
            };

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            id: otherUserId,
            other_user: otherUser,
            last_message: {
              content: message.content,
              created_at: message.created_at,
              sender_id: message.sender_id
            },
            unread_count: message.receiver_id === user.id ? 1 : 0
          });
        } else {
          const existing = conversationMap.get(otherUserId)!;
          if (new Date(message.created_at) > new Date(existing.last_message.created_at)) {
            existing.last_message = {
              content: message.content,
              created_at: message.created_at,
              sender_id: message.sender_id
            };
            if (message.receiver_id === user.id) {
              existing.unread_count += 1;
            }
          }
        }
      });

      setConversations(Array.from(conversationMap.values()));
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Messages</h1>
          <p className="text-muted">Please log in to view your messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Messages</h1>
          <Link
            href="/search"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Find People
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-muted mt-2">Loading conversations...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">💬</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No messages yet</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Start a conversation by searching for people and sending them a message.
            </p>
            <Link
              href="/search"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Find People to Message
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {conversations.map(conversation => (
              <Link
                key={conversation.id}
                href={`/messages/${conversation.other_user.id}`}
                className="block p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-4">
                  {conversation.other_user.avatar_url ? (
                    <Image
                      src={conversation.other_user.avatar_url}
                      alt={`${conversation.other_user.username}'s avatar`}
                      width={50}
                      height={50}
                      className="rounded-full border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white">
                      {conversation.other_user.username?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 dark:text-white">
                        @{conversation.other_user.username}
                      </h3>
                      {conversation.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold text-white bg-red-500 rounded-full">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                      {conversation.last_message.sender_id === user.id ? 'You: ' : ''}
                      {conversation.last_message.content}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {new Date(conversation.last_message.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
