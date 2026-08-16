import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IdeaImage {
  id: string;
  idea_id: string;
  image_url: string;
  sort_order: number;
  uploaded_by: string;
  created_at: string;
  // Voting data
  up_votes: number;
  down_votes: number;
  vote_score: number;
  user_vote?: 'up' | 'down' | null;
}

export interface IdeaPoll {
  id: string;
  idea_id: string;
  options: string[];
  created_by: string;
  created_at: string;
}

export interface IdeaPollVote {
  poll_id: string;
  option_index: number;
  count: number;
}

export interface IdeaPollResult {
  poll: IdeaPoll;
  votes: IdeaPollVote[];
  total_votes: number;
  user_vote?: number | null;
}

export interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: 'eingereicht' | 'abstimmung_laeuft' | 'wird_umgesetzt' | 'umgesetzt' | 'verworfen' | 'archiviert';
  image_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  voting_deadline: string | null;
  deadline_notification_sent: boolean;
  creator_name?: string;
  vote_count: number;
  up_votes: number;
  down_votes: number;
  user_vote?: 'up' | 'down' | null;
  comment_count: number;
  images: IdeaImage[];
  poll?: IdeaPollResult | null;
  thumbnail_image_id?: string | null;
}

export interface IdeaComment {
  id: string;
  idea_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_name?: string;
}

export interface IdeaVoteLog {
  id: string;
  idea_id: string;
  user_id: string;
  user_name?: string;
  action: 'added' | 'changed' | 'removed';
  previous_vote: string | null;
  new_vote: string | null;
  created_at: string;
}

export interface IdeaCategory {
  id: string;
  name: string;
  color: string;
}

export interface CreateIdeaData {
  title: string;
  description?: string;
  category: string;
  image_url?: string;
  poll_options?: string[];
}

export function useIdeas() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [categories, setCategories] = useState<IdeaCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadIdeasCount, setUnreadIdeasCount] = useState(0);
  const [readIdeaIds, setReadIdeaIds] = useState<Set<string>>(new Set());
  const [totalEligibleVoters, setTotalEligibleVoters] = useState(0);

  const fetchIdeas = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    setError(null);

    try {
      // Fetch ideas with creator info
      const { data: ideasData, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false });

      if (ideasError) throw ideasError;

      // Fetch profiles separately for creator names
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name');

      // Fetch vote counts
      const { data: votesData } = await supabase
        .from('idea_votes')
        .select('idea_id, vote_type');

      // Fetch user's votes
      const { data: userVotes } = await supabase
        .from('idea_votes')
        .select('idea_id, vote_type')
        .eq('user_id', user.id);

      // Fetch comment counts
      const { data: commentsData } = await supabase
        .from('idea_comments')
        .select('idea_id');

      // Calculate vote counts (up and down separately)
      const upVoteMap: Record<string, number> = {};
      const downVoteMap: Record<string, number> = {};
      (votesData ?? []).forEach((vote) => {
        if (vote.vote_type === 'up') {
          upVoteMap[vote.idea_id] = (upVoteMap[vote.idea_id] || 0) + 1;
        } else {
          downVoteMap[vote.idea_id] = (downVoteMap[vote.idea_id] || 0) + 1;
        }
      });

      const userVoteMap: Record<string, 'up' | 'down'> = {};
      (userVotes ?? []).forEach((vote) => {
        userVoteMap[vote.idea_id] = vote.vote_type as 'up' | 'down';
      });

      const commentCountMap: Record<string, number> = {};
      (commentsData ?? []).forEach((comment) => {
        commentCountMap[comment.idea_id] = (commentCountMap[comment.idea_id] || 0) + 1;
      });

      const profilesMap: Record<string, string> = {};
      (profilesData ?? []).forEach((p) => {
        profilesMap[p.id] = p.full_name || 'Unbekannt';
      });

      // Store total eligible voters count
      setTotalEligibleVoters((profilesData ?? []).length);

      // Fetch idea images
      const ideaIds = (ideasData ?? []).map(i => i.id);
      const imagesMap: Record<string, IdeaImage[]> = {};
      const imageVotesMap: Record<string, { up: number; down: number; userVote?: 'up' | 'down' }> = {};
      
      if (ideaIds.length > 0) {
        const { data: imagesData } = await supabase
          .from('idea_images')
          .select('*')
          .in('idea_id', ideaIds)
          .order('sort_order', { ascending: true });
        
        // Fetch image votes
        const imageIds = (imagesData ?? []).map(img => img.id);
        if (imageIds.length > 0) {
          const { data: imageVotesData } = await supabase
            .from('idea_image_votes')
            .select('image_id, vote_type')
            .in('image_id', imageIds);
          
          const { data: userImageVotes } = await supabase
            .from('idea_image_votes')
            .select('image_id, vote_type')
            .eq('user_id', user.id)
            .in('image_id', imageIds);
          
          // Calculate image vote counts
          (imageVotesData ?? []).forEach((vote) => {
            if (!imageVotesMap[vote.image_id]) {
              imageVotesMap[vote.image_id] = { up: 0, down: 0 };
            }
            if (vote.vote_type === 'up') {
              imageVotesMap[vote.image_id].up++;
            } else {
              imageVotesMap[vote.image_id].down++;
            }
          });
          
          // Add user votes
          (userImageVotes ?? []).forEach((vote) => {
            if (!imageVotesMap[vote.image_id]) {
              imageVotesMap[vote.image_id] = { up: 0, down: 0 };
            }
            imageVotesMap[vote.image_id].userVote = vote.vote_type as 'up' | 'down';
          });
        }
        
        (imagesData ?? []).forEach((img) => {
          if (!imagesMap[img.idea_id]) imagesMap[img.idea_id] = [];
          const voteData = imageVotesMap[img.id] || { up: 0, down: 0 };
          imagesMap[img.idea_id].push({
            ...img,
            up_votes: voteData.up,
            down_votes: voteData.down,
            vote_score: voteData.up - voteData.down,
            user_vote: voteData.userVote || null,
          } as IdeaImage);
        });
      }
      
      // Fetch polls and poll votes
      const pollsMap: Record<string, IdeaPollResult> = {};
      if (ideaIds.length > 0) {
        const { data: pollsData } = await supabase
          .from('idea_polls')
          .select('*')
          .in('idea_id', ideaIds);
        
        if (pollsData && pollsData.length > 0) {
          const pollIds = pollsData.map(p => p.id);
          
          const { data: pollVotesData } = await supabase
            .from('idea_poll_votes')
            .select('poll_id, option_index')
            .in('poll_id', pollIds);
          
          const { data: userPollVotes } = await supabase
            .from('idea_poll_votes')
            .select('poll_id, option_index')
            .eq('user_id', user.id)
            .in('poll_id', pollIds);
          
          const userPollVoteMap: Record<string, number> = {};
          (userPollVotes ?? []).forEach((v) => {
            userPollVoteMap[v.poll_id] = v.option_index;
          });
          
          pollsData.forEach((poll) => {
            const options = (poll.options as string[]) || [];
            const voteCounts: Record<number, number> = {};
            let totalVotes = 0;
            
            (pollVotesData ?? []).filter(v => v.poll_id === poll.id).forEach((v) => {
              voteCounts[v.option_index] = (voteCounts[v.option_index] || 0) + 1;
              totalVotes++;
            });
            
            const votes: IdeaPollVote[] = options.map((_, idx) => ({
              poll_id: poll.id,
              option_index: idx,
              count: voteCounts[idx] || 0,
            }));
            
            pollsMap[poll.idea_id] = {
              poll: {
                id: poll.id,
                idea_id: poll.idea_id,
                options,
                created_by: poll.created_by,
                created_at: poll.created_at,
              },
              votes,
              total_votes: totalVotes,
              user_vote: userPollVoteMap[poll.id] ?? null,
            };
          });
        }
      }

      // Fetch read status for current user
      const { data: readData } = await supabase
        .from('idea_reads')
        .select('idea_id')
        .eq('user_id', user.id);
      
      const readIdeaIdsSet = new Set((readData ?? []).map(r => r.idea_id));
      setReadIdeaIds(readIdeaIdsSet);
      
      // Calculate unread count (ideas not created by user and not read)
      const unreadCount = (ideasData ?? []).filter(
        idea => idea.created_by !== user.id && !readIdeaIdsSet.has(idea.id)
      ).length;
      setUnreadIdeasCount(unreadCount);

      const mappedIdeas: Idea[] = (ideasData ?? []).map((idea) => ({
        id: idea.id,
        title: idea.title,
        description: idea.description,
        category: idea.category,
        status: idea.status as Idea['status'],
        image_url: idea.image_url,
        created_by: idea.created_by,
        created_at: idea.created_at,
        updated_at: idea.updated_at,
        voting_deadline: idea.voting_deadline,
        deadline_notification_sent: idea.deadline_notification_sent ?? false,
        creator_name: profilesMap[idea.created_by] || 'Unbekannt',
        vote_count: (upVoteMap[idea.id] || 0) - (downVoteMap[idea.id] || 0),
        up_votes: upVoteMap[idea.id] || 0,
        down_votes: downVoteMap[idea.id] || 0,
        user_vote: userVoteMap[idea.id] || null,
        comment_count: commentCountMap[idea.id] || 0,
        images: imagesMap[idea.id] || [],
        poll: pollsMap[idea.id] || null,
        // Thumbnail is the image with highest vote score
        thumbnail_image_id: (imagesMap[idea.id] || []).length > 0
          ? [...(imagesMap[idea.id] || [])].sort((a, b) => b.vote_score - a.vote_score)[0]?.id
          : null,
      }));

      setIdeas(mappedIdeas);
      
      // Check for expired deadlines and send notifications to Kommandanten
      // This runs in the background without blocking
      if (supabase) {
        const now = new Date();
        const expiredIdeas = mappedIdeas.filter(idea => 
          ['eingereicht', 'abstimmung_laeuft'].includes(idea.status) &&
          idea.voting_deadline &&
          new Date(idea.voting_deadline) < now &&
          !idea.deadline_notification_sent
        );
        
        if (expiredIdeas.length > 0) {
          // Get Kommandanten and Admins
          const { data: kommandantenData } = await supabase
            .from('profiles')
            .select('id, full_name')
            .or('is_kommandant.eq.true,is_admin.eq.true');
          
          if (kommandantenData && kommandantenData.length > 0) {
            for (const idea of expiredIdeas) {
              // Send notification to all Kommandanten/Admins
              const notifications = kommandantenData.map(k => ({
                user_id: k.id,
                notification_type: 'idea',
                message: `Die Abstimmungsfrist f\u00fcr "${idea.title}" ist abgelaufen. Bitte entscheiden Sie \u00fcber den Status.`,
                subject: 'Abstimmungsfrist abgelaufen',
                idea_id: idea.id,
                is_read: false
              }));
              
              await supabase.from('notifications').insert(notifications);
              
              // Send push notifications
              try {
                await supabase.functions.invoke('send-push', {
                  body: {
                    userIds: kommandantenData.map(k => k.id),
                    payload: {
                      title: 'Abstimmungsfrist abgelaufen',
                      body: `"${idea.title}" - Bitte Status festlegen`,
                      tag: 'idea-deadline',
                      data: { url: '/ideenpool', type: 'idea', ideaId: idea.id }
                    }
                  }
                });
              } catch (pushError) {
                console.warn('Push notification failed:', pushError);
              }
              
              // Mark notification as sent
              await supabase
                .from('ideas')
                .update({ deadline_notification_sent: true })
                .eq('id', idea.id);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Ideen');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchCategories = useCallback(async () => {
    if (!supabase) return;

    const { data, error: catError } = await supabase
      .from('idea_categories')
      .select('*')
      .order('name');

    if (!catError && data) {
      setCategories(data);
    }
  }, []);

  useEffect(() => {
    fetchIdeas();
    fetchCategories();
  }, [fetchIdeas, fetchCategories]);

  const createIdea = async (data: CreateIdeaData): Promise<Idea | null> => {
    if (!supabase || !user) return null;

    // Set voting deadline to 2 months from now
    const votingDeadline = new Date();
    votingDeadline.setMonth(votingDeadline.getMonth() + 2);

    const { data: newIdea, error: createError } = await supabase
      .from('ideas')
      .insert({
        title: data.title,
        description: data.description || null,
        category: data.category,
        image_url: data.image_url || null,
        created_by: user.id,
        status: 'eingereicht',
        voting_deadline: votingDeadline.toISOString(),
      })
      .select()
      .single();

    if (createError) {
      setError(createError.message);
      return null;
    }

    // Create poll if options provided
    if (data.poll_options && data.poll_options.length > 0 && newIdea) {
      await supabase
        .from('idea_polls')
        .insert({
          idea_id: newIdea.id,
          options: data.poll_options,
          created_by: user.id,
        });
    }

    // Send notifications to all users (except creator)
    if (newIdea) {
      try {
        // Get all profiles
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, full_name');
        
        // Get creator name
        const creatorName = allProfiles?.find(p => p.id === user.id)?.full_name || 'Ein Mitglied';
        
        // Create in-app notifications for all users except creator
        const otherUsers = (allProfiles ?? []).filter(p => p.id !== user.id);
        if (otherUsers.length > 0) {
          const notifications = otherUsers.map(u => ({
            user_id: u.id,
            notification_type: 'idea',
            message: `${creatorName} hat eine neue Idee eingereicht: "${data.title}"`,
            subject: 'Neue Idee im Ideen-Pool',
            idea_id: newIdea.id,
            is_read: false
          }));
          
          await supabase.from('notifications').insert(notifications);
          
          // Send push notifications
          try {
            await supabase.functions.invoke('send-push', {
              body: {
                userIds: otherUsers.map(u => u.id),
                excludeUserId: user.id,
                payload: {
                  title: 'Neue Idee',
                  body: `${creatorName}: ${data.title}`,
                  tag: 'new-idea',
                  data: { url: '/ideenpool', type: 'idea', ideaId: newIdea.id }
                }
              }
            });
          } catch (pushError) {
            console.warn('Push notification failed (non-critical):', pushError);
          }
        }
        
        // Mark as read for creator automatically
        await supabase.from('idea_reads').insert({
          idea_id: newIdea.id,
          user_id: user.id
        });
      } catch (notifError) {
        console.warn('Notification creation failed (non-critical):', notifError);
      }
    }

    await fetchIdeas();
    return newIdea as Idea;
  };

  const updateIdea = async (id: string, updates: Partial<CreateIdeaData & { status: Idea['status'] }>): Promise<boolean> => {
    if (!supabase) return false;

    const { error: updateError } = await supabase
      .from('ideas')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
      return false;
    }

    await fetchIdeas();
    return true;
  };

  const deleteIdea = async (id: string): Promise<boolean> => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('ideas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
      return false;
    }

    await fetchIdeas();
    return true;
  };

  const vote = async (ideaId: string, voteType: 'up' | 'down'): Promise<boolean> => {
    if (!supabase || !user) return false;

    const idea = ideas.find((i) => i.id === ideaId);
    if (!idea) return false;

    const previousVote = idea.user_vote;
    
    // If same vote, remove it
    if (idea.user_vote === voteType) {
      const { error: deleteError } = await supabase
        .from('idea_votes')
        .delete()
        .eq('idea_id', ideaId)
        .eq('user_id', user.id);

      if (deleteError) {
        console.error('[vote] Error removing vote:', deleteError);
        return false;
      }
      
      // Log vote removal
      await supabase.from('idea_vote_logs').insert({
        idea_id: ideaId,
        user_id: user.id,
        action: 'removed',
        previous_vote: previousVote,
        new_vote: null
      });
    } else {
      // Upsert vote
      const { error: upsertError } = await supabase
        .from('idea_votes')
        .upsert({
          idea_id: ideaId,
          user_id: user.id,
          vote_type: voteType,
        }, {
          onConflict: 'idea_id,user_id',
        });

      if (upsertError) {
        console.error('[vote] Error upserting vote:', upsertError);
        return false;
      }
      
      // Log vote change
      await supabase.from('idea_vote_logs').insert({
        idea_id: ideaId,
        user_id: user.id,
        action: previousVote ? 'changed' : 'added',
        previous_vote: previousVote || null,
        new_vote: voteType
      });
    }

    await fetchIdeas();
    return true;
  };

  const getComments = useCallback(async (ideaId: string): Promise<IdeaComment[]> => {
    if (!supabase) return [];

    const { data, error: commentsError } = await supabase
      .from('idea_comments')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (commentsError || !data) return [];

    // Fetch profiles for user names
    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profilesMap: Record<string, string> = {};
    (profilesData ?? []).forEach((p) => {
      profilesMap[p.id] = p.full_name || 'Unbekannt';
    });

    return data.map((comment) => ({
      id: comment.id,
      idea_id: comment.idea_id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      user_name: profilesMap[comment.user_id] || 'Unbekannt',
    }));
  }, []);

  const addComment = async (ideaId: string, content: string): Promise<boolean> => {
    if (!supabase || !user) {
      console.error('[addComment] No supabase or user');
      return false;
    }

    console.log('[addComment] Inserting comment for idea:', ideaId, 'by user:', user.id);
    
    const { data, error: commentError } = await supabase
      .from('idea_comments')
      .insert({
        idea_id: ideaId,
        user_id: user.id,
        content,
      })
      .select();

    if (commentError) {
      console.error('[addComment] Error inserting comment:', commentError);
      return false;
    }
    
    console.log('[addComment] Comment inserted successfully:', data);

    await fetchIdeas();
    return true;
  };

  const deleteComment = async (commentId: string): Promise<boolean> => {
    if (!supabase) return false;

    const { error: deleteError } = await supabase
      .from('idea_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) return false;

    await fetchIdeas();
    return true;
  };

  const getVoteLogs = async (ideaId: string): Promise<IdeaVoteLog[]> => {
    if (!supabase) return [];

    const { data, error: logsError } = await supabase
      .from('idea_vote_logs')
      .select('*')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: true });

    if (logsError || !data) return [];

    // Fetch profiles for user names
    const userIds = [...new Set(data.map(l => l.user_id))];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profilesMap: Record<string, string> = {};
    (profilesData ?? []).forEach((p) => {
      profilesMap[p.id] = p.full_name || 'Unbekannt';
    });

    return data.map((log) => ({
      id: log.id,
      idea_id: log.idea_id,
      user_id: log.user_id,
      action: log.action as 'added' | 'changed' | 'removed',
      previous_vote: log.previous_vote,
      new_vote: log.new_vote,
      created_at: log.created_at,
      user_name: profilesMap[log.user_id] || 'Unbekannt',
    }));
  };

  // Image upload function
  const uploadIdeaImage = async (ideaId: string, file: File): Promise<string | null> => {
    if (!supabase || !user) return null;
    
    // Check file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('Datei zu groß. Maximal 5 MB erlaubt.');
      return null;
    }
    
    // Check current image count
    const { data: existingImages } = await supabase
      .from('idea_images')
      .select('id')
      .eq('idea_id', ideaId);
    
    if ((existingImages?.length ?? 0) >= 5) {
      setError('Maximal 5 Bilder pro Idee erlaubt.');
      return null;
    }
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${ideaId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('idea-images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('idea-images')
        .getPublicUrl(fileName);
      
      // Get next sort order
      const nextOrder = (existingImages?.length ?? 0);
      
      // Save to idea_images table
      const { error: insertError } = await supabase
        .from('idea_images')
        .insert({
          idea_id: ideaId,
          image_url: publicUrl,
          sort_order: nextOrder,
          uploaded_by: user.id,
        });
      
      if (insertError) throw insertError;
      
      await fetchIdeas();
      return publicUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hochladen');
      return null;
    }
  };

  // Vote on image function
  const voteOnImage = async (imageId: string, voteType: 'up' | 'down'): Promise<boolean> => {
    if (!supabase || !user) return false;
    
    try {
      // Check existing vote
      const { data: existingVote } = await supabase
        .from('idea_image_votes')
        .select('id, vote_type')
        .eq('image_id', imageId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingVote) {
        if (existingVote.vote_type === voteType) {
          // Same vote - remove it
          await supabase
            .from('idea_image_votes')
            .delete()
            .eq('id', existingVote.id);
        } else {
          // Different vote - update it
          await supabase
            .from('idea_image_votes')
            .update({ vote_type: voteType })
            .eq('id', existingVote.id);
        }
      } else {
        // New vote
        await supabase
          .from('idea_image_votes')
          .insert({
            image_id: imageId,
            user_id: user.id,
            vote_type: voteType,
          });
      }
      
      await fetchIdeas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Abstimmen');
      return false;
    }
  };

  // Create poll for idea
  const createPoll = async (ideaId: string, options: string[]): Promise<boolean> => {
    if (!supabase || !user) return false;
    if (options.length < 2) {
      setError('Mindestens 2 Optionen erforderlich');
      return false;
    }
    
    try {
      const { error: pollError } = await supabase
        .from('idea_polls')
        .insert({
          idea_id: ideaId,
          options,
          created_by: user.id,
        });
      
      if (pollError) throw pollError;
      
      await fetchIdeas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Erstellen der Umfrage');
      return false;
    }
  };

  // Vote on poll
  const voteOnPoll = async (pollId: string, optionIndex: number): Promise<boolean> => {
    if (!supabase || !user) return false;
    
    try {
      // Check existing vote
      const { data: existingVote } = await supabase
        .from('idea_poll_votes')
        .select('id, option_index')
        .eq('poll_id', pollId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (existingVote) {
        if (existingVote.option_index === optionIndex) {
          // Same option - remove vote
          await supabase
            .from('idea_poll_votes')
            .delete()
            .eq('id', existingVote.id);
        } else {
          // Different option - update
          await supabase
            .from('idea_poll_votes')
            .update({ option_index: optionIndex })
            .eq('id', existingVote.id);
        }
      } else {
        // New vote
        await supabase
          .from('idea_poll_votes')
          .insert({
            poll_id: pollId,
            user_id: user.id,
            option_index: optionIndex,
          });
      }
      
      await fetchIdeas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Abstimmen');
      return false;
    }
  };

  // Delete poll
  const deletePoll = async (pollId: string): Promise<boolean> => {
    if (!supabase || !user) return false;
    
    try {
      const { error: deleteError } = await supabase
        .from('idea_polls')
        .delete()
        .eq('id', pollId)
        .eq('created_by', user.id);
      
      if (deleteError) throw deleteError;
      
      await fetchIdeas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen der Umfrage');
      return false;
    }
  };

  // Delete image function
  const deleteIdeaImage = async (imageId: string): Promise<boolean> => {
    if (!supabase || !user) return false;
    
    try {
      // Get image URL to delete from storage
      const { data: imageData } = await supabase
        .from('idea_images')
        .select('image_url')
        .eq('id', imageId)
        .single();
      
      if (imageData?.image_url) {
        // Extract path from URL
        const url = new URL(imageData.image_url);
        const pathParts = url.pathname.split('/idea-images/');
        if (pathParts[1]) {
          await supabase.storage
            .from('idea-images')
            .remove([pathParts[1]]);
        }
      }
      
      // Delete from table
      const { error: deleteError } = await supabase
        .from('idea_images')
        .delete()
        .eq('id', imageId);
      
      if (deleteError) throw deleteError;
      
      await fetchIdeas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Löschen');
      return false;
    }
  };

  // Mark idea as read
  const markIdeaAsRead = async (ideaId: string): Promise<boolean> => {
    if (!supabase || !user) return false;
    
    // Already read?
    if (readIdeaIds.has(ideaId)) return true;
    
    try {
      const { error: insertError } = await supabase
        .from('idea_reads')
        .upsert({
          idea_id: ideaId,
          user_id: user.id
        }, {
          onConflict: 'idea_id,user_id'
        });
      
      if (insertError) throw insertError;
      
      // Update local state
      setReadIdeaIds(prev => new Set([...prev, ideaId]));
      setUnreadIdeasCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (err) {
      console.error('Error marking idea as read:', err);
      return false;
    }
  };

  // Check if idea is read
  const isIdeaRead = (ideaId: string): boolean => {
    return readIdeaIds.has(ideaId);
  };

  // Update voting deadline (for Admin/Kommandant)
  const updateVotingDeadline = async (ideaId: string, newDeadline: Date): Promise<boolean> => {
    if (!supabase) return false;
    
    try {
      const { error: updateError } = await supabase
        .from('ideas')
        .update({ 
          voting_deadline: newDeadline.toISOString(),
          deadline_notification_sent: false // Reset notification flag
        })
        .eq('id', ideaId);
      
      if (updateError) throw updateError;
      
      await fetchIdeas();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Aktualisieren der Frist');
      return false;
    }
  };

  return {
    ideas,
    categories,
    loading,
    error,
    totalEligibleVoters,
    unreadIdeasCount,
    createIdea,
    updateIdea,
    deleteIdea,
    vote,
    voteOnImage,
    createPoll,
    voteOnPoll,
    deletePoll,
    getComments,
    addComment,
    deleteComment,
    getVoteLogs,
    uploadIdeaImage,
    deleteIdeaImage,
    markIdeaAsRead,
    isIdeaRead,
    updateVotingDeadline,
    refetch: fetchIdeas,
  };
}
