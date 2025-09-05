import { supabaseAdmin } from './supabaseServer';

export interface NotificationData {
  user_id: string;
  actor_id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'post_shared';
  entity_type: 'post' | 'comment' | 'user';
  entity_id: string;
  title: string;
  message: string;
}

export class NotificationService {
  private static supabase = supabaseAdmin();

  static async createNotification(data: NotificationData): Promise<string | null> {
    try {
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          recipient_id: data.user_id,  // Use recipient_id instead of user_id
          sender_id: data.actor_id,    // Use sender_id instead of actor_id
          notification_type: data.type, // Use notification_type instead of type
          entity_type: data.entity_type,
          entity_id: data.entity_id,
          title: data.title,
          message: data.message
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return notification?.id || null;
    } catch (error) {
      console.error('NotificationService error:', error);
      return null;
    }
  }

  static async createLikeNotification(postId: string, postAuthorId: string, likerId: string, likerUsername: string) {
    if (postAuthorId === likerId) return; // Don't notify self

    return this.createNotification({
      user_id: postAuthorId,
      actor_id: likerId,
      type: 'like',
      entity_type: 'post',
      entity_id: postId,
      title: 'New Like',
      message: `${likerUsername} liked your post`
    });
  }

  static async createCommentNotification(postId: string, postAuthorId: string, commenterId: string, commenterUsername: string) {
    if (postAuthorId === commenterId) return; // Don't notify self

    return this.createNotification({
      user_id: postAuthorId,
      actor_id: commenterId,
      type: 'comment',
      entity_type: 'post',
      entity_id: postId,
      title: 'New Comment',
      message: `${commenterUsername} commented on your post`
    });
  }

  static async createFollowNotification(followedUserId: string, followerId: string, followerUsername: string) {
    if (followedUserId === followerId) return; // Don't notify self

    return this.createNotification({
      user_id: followedUserId,
      actor_id: followerId,
      type: 'follow',
      entity_type: 'user',
      entity_id: followerId,
      title: 'New Follower',
      message: `${followerUsername} started following you`
    });
  }

  static async createAcceptedFollowNotification(followerId: string, acceptedByUserId: string, acceptedByUsername: string) {
    if (followerId === acceptedByUserId) return; // Don't notify self

    return this.createNotification({
      user_id: followerId,
      actor_id: acceptedByUserId,
      type: 'follow',
      entity_type: 'user',
      entity_id: acceptedByUserId,
      title: 'Follow Request Accepted',
      message: `${acceptedByUsername} accepted your follow request`
    });
  }

  static async createMentionNotification(mentionedUserId: string, mentionerId: string, mentionerUsername: string, postId: string) {
    if (mentionedUserId === mentionerId) return; // Don't notify self

    return this.createNotification({
      user_id: mentionedUserId,
      actor_id: mentionerId,
      type: 'mention',
      entity_type: 'post',
      entity_id: postId,
      title: 'You were mentioned',
      message: `${mentionerUsername} mentioned you in a post`
    });
  }

  static async createPostSharedNotification(postId: string, postAuthorId: string, sharerId: string, sharerUsername: string) {
    if (postAuthorId === sharerId) return; // Don't notify self

    return this.createNotification({
      user_id: postAuthorId,
      actor_id: sharerId,
      type: 'post_shared',
      entity_type: 'post',
      entity_id: postId,
      title: 'Post Shared',
      message: `${sharerUsername} shared your post`
    });
  }

  // Extract mentions from text (e.g., @username)
  static extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  // Get user ID by username
  static async getUserIdByUsername(username: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .single();

      if (error || !data) return null;
      return data.id;
    } catch (error) {
      console.error('Error getting user ID by username:', error);
      return null;
    }
  }

  // Process mentions in post content
  static async processMentions(content: string, postId: string, mentionerId: string, mentionerUsername: string) {
    const mentions = this.extractMentions(content);
    
    for (const username of mentions) {
      const userId = await this.getUserIdByUsername(username);
      if (userId) {
        await this.createMentionNotification(userId, mentionerId, mentionerUsername, postId);
      }
    }
  }
}
