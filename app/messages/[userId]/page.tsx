'use client';
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/useAuth';
import { supabaseBrowser } from '@/lib/supabaseClient';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_username: string;
  sender_avatar_url: string;
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

export default function MessagePage() {
  const { user } = useAuth();
  const params = useParams();
  const otherUserId = params.userId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && otherUserId) {
      loadMessages();
      loadOtherUser();
    }
  }, [user, otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadOtherUser = async () => {
    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .eq('id', otherUserId)
        .single();

      if (error) {
        console.error('Error loading user:', error);
        return;
      }

      setOtherUser(data);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadMessages = async () => {
    if (!user || !otherUserId) return;

    setLoading(true);
    try {
      const sb = supabaseBrowser();
      const { data, error } = await sb
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          content,
          is_read,
          created_at,
          profiles!messages_sender_id_fkey (
            username,
            avatar_url
          )
        `)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      const formattedMessages = (data as any)?.map((msg: any) => ({
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        is_read: msg.is_read,
        created_at: msg.created_at,
        sender_username: msg.profiles?.username || 'Unknown',
        sender_avatar_url: msg.profiles?.avatar_url || null
      })) || [];

      setMessages(formattedMessages);

      // Mark messages as read
      await markMessagesAsRead();
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    if (!user || !otherUserId) return;

    try {
      const sb = supabaseBrowser();
      await (sb as any)
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !otherUserId || sending) return;

    setSending(true);
    try {
      const sb = supabaseBrowser();
      const { data, error } = await (sb as any)
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: otherUserId,
          content: newMessage.trim()
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        alert('Failed to send message');
        return;
      }

      // Add message to local state
      const newMsg: Message = {
        id: data.id,
        sender_id: user.id,
        receiver_id: otherUserId,
        content: newMessage.trim(),
        is_read: true,
        created_at: data.created_at,
        sender_username: user.user_metadata?.username || 'You',
        sender_avatar_url: user.user_metadata?.avatar_url || null
      };

      setMessages(prev => [...prev, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Messages</h1>
          <p className="text-muted">Please log in to view messages.</p>
        </div>
      </div>
    );
  }

  if (!otherUser) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
          <p className="text-muted">The user you're looking for doesn't exist.</p>
          <Link
            href="/messages"
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="card p-6 h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-200 dark:border-slate-700 mb-4">
          <Link href="/messages" className="text-blue-600 hover:text-blue-700">
            ← Back
          </Link>
          {otherUser.avatar_url ? (
            <Image
              src={otherUser.avatar_url}
              alt={`${otherUser.username}'s avatar`}
              width={40}
              height={40}
              className="rounded-full border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
              {otherUser.username?.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="font-semibold text-slate-900 dark:text-white">
              @{otherUser.username}
            </h1>
            {otherUser.first_name && otherUser.last_name && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {otherUser.first_name} {otherUser.last_name}
              </p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-muted mt-2">Loading messages...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender_id === user.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    message.sender_id === user.id
                      ? 'text-blue-100'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}>
                    {new Date(message.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 input"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}
