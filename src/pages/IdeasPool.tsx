import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useIdeas, Idea, IdeaComment, CreateIdeaData, IdeaPollResult } from '@/hooks/useIdeas';
import { useTasks, CreateTaskData } from '@/hooks/useTasks';
import { useAuth } from '@/contexts/AuthContext';
import { useSimulation } from '@/contexts/SimulationContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useSettings } from '@/hooks/useSettings';
import { generateIdeaApprovalPdf, VoteLog } from '@/utils/generateIdeaApprovalPdf';
import {
  Lightbulb,
  Plus,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Filter,
  X,
  Send,
  Trash2,
  Edit2,
  Image,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  SortAsc,
  SortDesc,
  User,
  Calendar,
  ListTodo,
  Download,
  FileText,
  ChevronLeft,
  ChevronRight,
  Upload,
  ImagePlus,
  BarChart3,
  Vote,
  Archive,
  Trash2 as TrashIcon } from
'lucide-react';

type SortOption = 'newest' | 'oldest' | 'most_votes' | 'most_comments';
type StatusFilter = 'all' | 'eingereicht' | 'abstimmung_laeuft' | 'wird_umgesetzt' | 'umgesetzt' | 'verworfen' | 'archiviert';

const STATUS_CONFIG = {
  eingereicht: { label: 'Eingereicht', color: 'bg-blue-100 text-blue-800', icon: Clock, watermark: null },
  abstimmung_laeuft: { label: 'Abstimmung läuft', color: 'bg-amber-100 text-amber-800', icon: Vote, watermark: null },
  wird_umgesetzt: { label: 'Wird umgesetzt', color: 'bg-emerald-100 text-emerald-800', icon: Loader2, watermark: { text: '✓ WIRD UMGESETZT', color: 'bg-emerald-600/80' } },
  umgesetzt: { label: 'Umgesetzt', color: 'bg-green-100 text-green-800', icon: CheckCircle2, watermark: { text: '✓ UMGESETZT', color: 'bg-green-600/80' } },
  verworfen: { label: 'Verworfen', color: 'bg-red-100 text-red-800', icon: XCircle, watermark: { text: '✗ VERWORFEN', color: 'bg-red-600/80' } },
  archiviert: { label: 'Archiviert', color: 'bg-gray-100 text-gray-600', icon: Archive, watermark: { text: 'ARCHIVIERT', color: 'bg-gray-600/70' } }
};

export default function IdeasPool() {
  const { user, profile: authProfile } = useAuth();
  const { effectiveUserId, effectiveIsAdmin, effectiveIsKommandant } = useSimulation();

  // Verwende simulierte Werte
  const isAdmin = effectiveIsAdmin;
  const isKommandant = effectiveIsKommandant;
  const currentUserId = effectiveUserId;

  const {
    ideas,
    categories,
    loading,
    totalEligibleVoters,
    unreadIdeasCount,
    createIdea,
    updateIdea,
    deleteIdea,
    vote,
    getComments,
    addComment,
    deleteComment,
    getVoteLogs,
    uploadIdeaImage,
    deleteIdeaImage,
    voteOnImage,
    createPoll,
    voteOnPoll,
    deletePoll,
    markIdeaAsRead,
    isIdeaRead,
    updateVotingDeadline
  } = useIdeas();
  const { createTask } = useTasks();
  const { profiles } = useProfiles();
  const { pdfBackgroundUrl, pdfBackgroundOpacity, commanderSignatureUrl, commanderStampUrl } = useSettings();

  const [showNewIdeaModal, setShowNewIdeaModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [comments, setComments] = useState<IdeaComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showArchive, setShowArchive] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  // New Idea Form
  const [newIdea, setNewIdea] = useState<CreateIdeaData>({
    title: '',
    description: '',
    category: 'Allgemein',
    image_url: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Task creation modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [ideaForTask, setIdeaForTask] = useState<Idea | null>(null);
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    end_date: ''
  });
  const [creatingTask, setCreatingTask] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [votingIdeaId, setVotingIdeaId] = useState<string | null>(null);
  const [addingComment, setAddingComment] = useState(false);

  // Image slider state
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [votingImageId, setVotingImageId] = useState<string | null>(null);

  // Poll state
  const [showPollOptions, setShowPollOptions] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);

  // New idea image upload state
  const [newIdeaFiles, setNewIdeaFiles] = useState<File[]>([]);
  const [editIdeaFiles, setEditIdeaFiles] = useState<File[]>([]);

  const canManageAll = isAdmin || isKommandant;

  // Track which idea we've loaded comments for
  const [loadedCommentsForId, setLoadedCommentsForId] = useState<string | null>(null);

  // Load comments when idea is selected (only when id changes)
  useEffect(() => {
    if (selectedIdea && selectedIdea.id !== loadedCommentsForId) {
      setLoadingComments(true);
      setLoadedCommentsForId(selectedIdea.id);
      getComments(selectedIdea.id).then((data) => {
        setComments(data);
        setLoadingComments(false);
      });
      // Mark idea as read when opened
      markIdeaAsRead(selectedIdea.id);
    }
    if (!selectedIdea) {
      setLoadedCommentsForId(null);
      setComments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadedCommentsForId und selectedIdea werden intern verwaltet
  }, [selectedIdea?.id, getComments, markIdeaAsRead]);

  // Reset image slider index when selecting a new idea
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedIdea?.id]);

  // Update selectedIdea when ideas change (for vote counts, status, images, polls, etc.)
  useEffect(() => {
    if (selectedIdea) {
      const updatedIdea = ideas.find((i) => i.id === selectedIdea.id);
      if (updatedIdea) {
        // Check if relevant fields changed
        const voteChanged = updatedIdea.vote_count !== selectedIdea.vote_count ||
        updatedIdea.up_votes !== selectedIdea.up_votes ||
        updatedIdea.down_votes !== selectedIdea.down_votes ||
        updatedIdea.user_vote !== selectedIdea.user_vote;
        const statusChanged = updatedIdea.status !== selectedIdea.status;
        const commentChanged = updatedIdea.comment_count !== selectedIdea.comment_count;
        const imagesChanged = JSON.stringify(updatedIdea.images) !== JSON.stringify(selectedIdea.images);
        const pollChanged = JSON.stringify(updatedIdea.poll) !== JSON.stringify(selectedIdea.poll);
        const thumbnailChanged = updatedIdea.thumbnail_image_id !== selectedIdea.thumbnail_image_id;

        if (voteChanged || statusChanged || commentChanged || imagesChanged || pollChanged || thumbnailChanged) {
          setSelectedIdea(updatedIdea);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- selectedIdea wird absichtlich nicht als dep inkludiert um Endlosschleife zu vermeiden
  }, [ideas]);

  // Filter and sort ideas
  const filteredIdeas = ideas.
  filter((idea) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!idea.title.toLowerCase().includes(query) &&
      !idea.description?.toLowerCase().includes(query)) {
        return false;
      }
    }
    if (categoryFilter !== 'all' && idea.category !== categoryFilter) return false;
    if (statusFilter !== 'all' && idea.status !== statusFilter) return false;
    // Hide archived AND verworfen ideas unless explicitly showing archive or filtering by them
    if (!showArchive && statusFilter !== 'archiviert' && statusFilter !== 'verworfen' && 
        (idea.status === 'archiviert' || idea.status === 'verworfen')) return false;
    return true;
  }).
  sort((a, b) => {
    switch (sortOption) {
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'most_votes':
        return b.vote_count - a.vote_count;
      case 'most_comments':
        return b.comment_count - a.comment_count;
      default: // newest
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const handleCreateIdea = async () => {
    if (!newIdea.title.trim()) return;
    setSubmitting(true);

    // Include poll options if enabled and valid
    const ideaData: CreateIdeaData = {
      ...newIdea,
      poll_options: showPollOptions && pollOptions.filter((o) => o.trim()).length >= 2 ?
      pollOptions.filter((o) => o.trim()) :
      undefined
    };

    const created = await createIdea(ideaData);
    if (created) {
      // Upload images if any
      if (newIdeaFiles.length > 0) {
        for (const file of newIdeaFiles) {
          await uploadIdeaImage(created.id, file);
        }
      }
      setNewIdea({ title: '', description: '', category: 'Allgemein', image_url: '' });
      setNewIdeaFiles([]);
      setShowPollOptions(false);
      setPollOptions(['', '']);
      setShowNewIdeaModal(false);
    }
    setSubmitting(false);
  };

  // Handle file selection for new idea
  const handleNewIdeaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((f) => f.size <= 5 * 1024 * 1024); // Max 5MB
    const totalFiles = [...newIdeaFiles, ...validFiles].slice(0, 5); // Max 5 files
    setNewIdeaFiles(totalFiles);
    e.target.value = ''; // Reset input
  };

  const removeNewIdeaFile = (index: number) => {
    setNewIdeaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateIdea = async () => {
    if (!editingIdea) return;
    setSubmitting(true);
    await updateIdea(editingIdea.id, {
      title: editingIdea.title,
      description: editingIdea.description || undefined,
      category: editingIdea.category,
      image_url: editingIdea.image_url || undefined
    });
    setEditingIdea(null);
    setSubmitting(false);
  };

  const handleDeleteIdea = async (idea: Idea) => {
    if (window.confirm('Möchten Sie diese Idee wirklich löschen?')) {
      await deleteIdea(idea.id);
      if (selectedIdea?.id === idea.id) setSelectedIdea(null);
    }
  };

  const handleVote = async (ideaId: string, voteType: 'up' | 'down') => {
    setVotingIdeaId(ideaId);
    try {
      await vote(ideaId, voteType);
      // The useEffect above will update selectedIdea when ideas change
    } finally {
      setVotingIdeaId(null);
    }
  };

  const handleAddComment = async () => {
    if (!selectedIdea || !newComment.trim() || addingComment) return;
    setAddingComment(true);
    try {
      const success = await addComment(selectedIdea.id, newComment);
      if (success) {
        setNewComment('');
        const updatedComments = await getComments(selectedIdea.id);
        setComments(updatedComments);
      }
    } finally {
      setAddingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (window.confirm('Kommentar löschen?')) {
      await deleteComment(commentId);
      if (selectedIdea) {
        const updatedComments = await getComments(selectedIdea.id);
        setComments(updatedComments);
      }
    }
  };

  const handleImageUpload = async (ideaId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        const result = await uploadIdeaImage(ideaId, file);
        if (!result) break; // Stop on error
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageDelete = async (imageId: string) => {
    if (window.confirm('Bild löschen?')) {
      await deleteIdeaImage(imageId);
    }
  };

  // Handle image voting
  const handleImageVote = async (imageId: string, voteType: 'up' | 'down') => {
    setVotingImageId(imageId);
    try {
      await voteOnImage(imageId, voteType);
    } finally {
      setVotingImageId(null);
    }
  };

  // Handle poll voting
  const handlePollVote = async (pollId: string, optionIndex: number) => {
    setVotingPollId(pollId);
    try {
      await voteOnPoll(pollId, optionIndex);
    } finally {
      setVotingPollId(null);
    }
  };

  // Add poll option
  const addPollOption = () => {
    if (pollOptions.length < 10) {
      setPollOptions([...pollOptions, '']);
    }
  };

  // Remove poll option
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  // Update poll option
  const updatePollOption = (index: number, value: string) => {
    const updated = [...pollOptions];
    updated[index] = value;
    setPollOptions(updated);
  };

  const handleStatusChange = async (idea: Idea, newStatus: Idea['status']) => {
    // If changing to "genehmigt", open task creation modal
    if (newStatus === 'genehmigt' && isKommandant) {
      setIdeaForTask(idea);
      setTaskData({
        title: `Idee umsetzen: ${idea.title}`,
        description: idea.description || `Umsetzung der genehmigten Idee aus dem Ideen-Pool.\n\nKategorie: ${idea.category}\nEingereicht von: ${idea.creator_name}`,
        assigned_to: '',
        end_date: ''
      });
      setShowTaskModal(true);
      return;
    }
    
    // Only Admin/Kommandant can archive or reject (verworfen)
    if ((newStatus === 'archiviert' || newStatus === 'verworfen') && !(isAdmin || isKommandant)) {
      return; // Silently ignore
    }
    
    await updateIdea(idea.id, { status: newStatus });
  };

  const handleCreateTaskForIdea = async () => {
    if (!ideaForTask || !taskData.title.trim() || !taskData.end_date) return;

    setCreatingTask(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newTask = await createTask({
        title: taskData.title,
        description: taskData.description,
        start_date: today,
        end_date: taskData.end_date,
        priority: 'medium',
        category: ideaForTask.category,
        assigned_to: taskData.assigned_to || undefined,
        visible_to_all: false
      });

      if (newTask) {
        // Update idea status to "in_bearbeitung"
        await updateIdea(ideaForTask.id, { status: 'in_bearbeitung' });
        setShowTaskModal(false);
        setIdeaForTask(null);
        setSelectedIdea(null);
      }
    } catch (err) {
      console.error('Error creating task:', err);
      alert('Fehler beim Erstellen der Aufgabe');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDownloadApprovalPdf = async (idea: Idea) => {
    if (!profile) return;

    setGeneratingPdf(true);
    try {
      // Fetch vote logs for the idea
      const voteLogs = await getVoteLogs(idea.id);

      // Convert to the PDF format
      const pdfVoteLogs: VoteLog[] = voteLogs.map((log) => ({
        id: log.id,
        user_id: log.user_id,
        user_name: log.user_name || 'Unbekannt',
        action: log.action,
        previous_vote: log.previous_vote,
        new_vote: log.new_vote,
        created_at: log.created_at
      }));

      // Find commander name from profiles
      const commander = profiles.find((p) => p.role === 'kommandant');
      const commanderName = commander?.full_name || profile.full_name || 'Kommandant';

      await generateIdeaApprovalPdf({
        idea: {
          id: idea.id,
          title: idea.title,
          description: idea.description,
          category: idea.category,
          status: idea.status,
          created_at: idea.created_at,
          creator_name: idea.creator_name || 'Unbekannt',
          vote_count: idea.vote_count,
          up_votes: idea.up_votes,
          down_votes: idea.down_votes,
          comment_count: idea.comment_count
        },
        voteLogs: pdfVoteLogs,
        totalEligibleVoters,
        approvedAt: idea.updated_at,
        approvedBy: commanderName,
        pdfBackgroundUrl,
        pdfBackgroundOpacity,
        signatureUrl: commanderSignatureUrl,
        stampUrl: commanderStampUrl,
        commanderName
      });
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Fehler beim Erstellen der PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getCategoryColor = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat?.color || '#6b7280';
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calculate remaining days until deadline
  const getDeadlineInfo = (deadline: string | null) => {
    if (!deadline) return null;
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Abgelaufen', color: 'text-red-600 bg-red-100', isExpired: true, days: diffDays };
    } else if (diffDays === 0) {
      return { text: 'Heute', color: 'text-amber-600 bg-amber-100', isExpired: false, days: 0 };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} Tag${diffDays === 1 ? '' : 'e'}`, color: 'text-amber-600 bg-amber-100', isExpired: false, days: diffDays };
    } else {
      return { text: `${diffDays} Tage`, color: 'text-muted-foreground bg-muted', isExpired: false, days: diffDays };
    }
  };

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_c94fe8238c" className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_c99b375238" className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div data-ev-id="ev_d0b05a1174" className="flex flex-col gap-4 mb-6">
          <div data-ev-id="ev_9a65f82eae" className="flex items-center justify-between">
            <div data-ev-id="ev_78897ce24c" className="flex items-center gap-3">
              <div data-ev-id="ev_4cc74ab383" className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Lightbulb className="w-6 h-6 text-white" />
              </div>
              <div data-ev-id="ev_2fdc869c1c">
                <div data-ev-id="ev_fc4dbbd964" className="flex items-center gap-2">
                  <h1 data-ev-id="ev_e8f872859f" className="text-2xl font-bold text-foreground">Ideen-Pool</h1>
                  {unreadIdeasCount > 0 &&
                  <span data-ev-id="ev_85e37174d9" className="px-2 py-0.5 text-xs font-bold bg-primary text-primary-foreground rounded-full animate-pulse">
                      {unreadIdeasCount} ungelesen
                    </span>
                  }
                </div>
                <p data-ev-id="ev_f3547320c5" className="text-sm text-muted-foreground">
                  {ideas.length} Ideen · {ideas.filter((i) => i.status === 'neu').length} neu
                </p>
              </div>
            </div>
            <button data-ev-id="ev_81c5ef5acf"
            onClick={() => setShowNewIdeaModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-md">

              <Plus className="w-5 h-5" />
              <span data-ev-id="ev_3ede358b3d" className="hidden sm:inline">Neue Idee</span>
            </button>
          </div>

          {/* Filters */}
          <div data-ev-id="ev_97f82505ef" className="flex flex-wrap gap-3 items-center bg-card rounded-xl p-4 border border-border">
            <div data-ev-id="ev_bd5e0cac9a" className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input data-ev-id="ev_6da0a2aeec"
              type="text"
              placeholder="Ideen durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

            </div>

            <select data-ev-id="ev_7848d4461c"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">

              <option data-ev-id="ev_ec146cba65" value="all">Alle Kategorien</option>
              {categories.map((cat) =>
              <option data-ev-id="ev_262262ec17" key={cat.id} value={cat.name}>{cat.name}</option>
              )}
            </select>

            <select data-ev-id="ev_b3a451500d"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">

              <option data-ev-id="ev_329d4ce5f5" value="all">Alle Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) =>
              <option data-ev-id="ev_05c21f763b" key={key} value={key}>{config.label}</option>
              )}
            </select>

            <select data-ev-id="ev_efa6696448"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50">

              <option data-ev-id="ev_c575875cfc" value="newest">Neueste zuerst</option>
              <option data-ev-id="ev_ef89c864bd" value="oldest">Älteste zuerst</option>
              <option data-ev-id="ev_3bfbee06c2" value="most_votes">Meiste Stimmen</option>
              <option data-ev-id="ev_7996c8e7c8" value="most_comments">Meiste Kommentare</option>
            </select>

            {/* Archive Toggle */}
            <button data-ev-id="ev_83e15fca98"
            onClick={() => setShowArchive(!showArchive)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            showArchive ?
            'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
            'bg-background border border-border text-muted-foreground hover:bg-muted'}`
            }>

              <Archive className="w-4 h-4" />
              <span data-ev-id="ev_4fa1f37819" className="hidden sm:inline">Archiv {showArchive ? 'ausblenden' : 'anzeigen'}</span>
            </button>
          </div>
        </div>

        {/* Ideas Grid - Pinterest Style */}
        {filteredIdeas.length === 0 ?
        <div data-ev-id="ev_eaf1c90cbd" className="text-center py-16">
            <Lightbulb className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 data-ev-id="ev_471ffec62a" className="text-lg font-medium text-foreground mb-2">Keine Ideen gefunden</h3>
            <p data-ev-id="ev_181cdaf490" className="text-muted-foreground mb-4">Starten Sie mit der ersten Idee!</p>
            <button data-ev-id="ev_72e8bb2bd9"
          onClick={() => setShowNewIdeaModal(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">

              Idee hinzufügen
            </button>
          </div> :

        <div data-ev-id="ev_8ccc5300c8" className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
            {filteredIdeas.map((idea) => {
            const statusConfig = STATUS_CONFIG[idea.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.eingereicht;
            const StatusIcon = statusConfig.icon;
            const isOwner = idea.created_by === currentUserId;
            const isUnread = !isOwner && !isIdeaRead(idea.id);

            return (
              <div data-ev-id="ev_2c22b482f4"
              key={idea.id}
              className={`break-inside-avoid mb-4 bg-card rounded-xl border overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group ${isUnread ? 'border-primary/50 ring-2 ring-primary/20' : 'border-border'}`}
              onClick={() => setSelectedIdea(idea)}>

                  {/* Image - Show thumbnail (highest voted) */}
                  {(idea.images.length > 0 || idea.image_url) && (() => {
                  // Get the thumbnail image (highest vote score)
                  const thumbnailImg = idea.thumbnail_image_id ?
                  idea.images.find((img) => img.id === idea.thumbnail_image_id) :
                  idea.images[0];
                  const imgUrl = thumbnailImg?.image_url || idea.image_url || '';
                  const watermark = statusConfig.watermark;

                  return (
                    <div data-ev-id="ev_f29e195de6" className={`relative aspect-video bg-muted ${idea.status === 'verworfen' ? 'opacity-60' : ''}`}>
                        <img data-ev-id="ev_fc3c16d158"
                      src={imgUrl}
                      alt={idea.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }} />

                        {/* Wasserzeichen */}
                        {watermark &&
                      <div data-ev-id="ev_62d629caf3" className={`absolute inset-0 flex items-center justify-center ${watermark.color}`}>
                            <span data-ev-id="ev_90fa09831d" className="text-white font-bold text-lg tracking-wider rotate-[-15deg] drop-shadow-lg">
                              {watermark.text}
                            </span>
                          </div>
                      }

                        {idea.images.length > 1 &&
                      <div data-ev-id="ev_53f2c4ee0c" className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <Vote className="w-3 h-3" />
                            +{idea.images.length - 1}
                          </div>
                      }
                        {thumbnailImg && thumbnailImg.vote_score > 0 && !watermark &&
                      <div data-ev-id="ev_0cb556395c" className="absolute top-2 left-2 bg-green-500/90 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3" />
                            {thumbnailImg.vote_score}
                          </div>
                      }
                      </div>);

                })()}
                  
                  {/* Poll indicator */}
                  {idea.poll &&
                <div data-ev-id="ev_c5bf9d97fd" className="px-4 pt-3 pb-0">
                      <div data-ev-id="ev_b8cb8e559b" className="flex items-center gap-2 text-xs text-primary font-medium bg-primary/10 px-2 py-1 rounded-lg">
                        <BarChart3 className="w-3 h-3" />
                        Umfrage · {idea.poll.total_votes} Stimmen
                      </div>
                    </div>
                }

                  <div data-ev-id="ev_2be97c3338" className="p-4">
                    {/* Category & Status */}
                    <div data-ev-id="ev_c1e9620501" className="flex items-center gap-2 mb-2 flex-wrap">
                      {isUnread &&
                    <span data-ev-id="ev_10628a92ed" className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary text-primary-foreground animate-pulse">
                          NEU
                        </span>
                    }
                      <span data-ev-id="ev_c465ae7289"
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: getCategoryColor(idea.category) }}>

                        {idea.category}
                      </span>
                      <span data-ev-id="ev_6d4812f2b9" className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h3 data-ev-id="ev_c7efc69e71" className="font-semibold text-foreground mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                      {idea.title}
                    </h3>
                    {idea.description &&
                  <p data-ev-id="ev_ed890f07ad" className="text-sm text-muted-foreground mb-3 line-clamp-3">
                        {idea.description}
                      </p>
                  }

                    {/* Meta */}
                    <div data-ev-id="ev_e481fc469f" className="flex items-center gap-2 text-xs text-muted-foreground mb-3 flex-wrap">
                      <User className="w-3 h-3" />
                      <span data-ev-id="ev_4538706325">{idea.creator_name}</span>
                      <span data-ev-id="ev_e4defae2ba">·</span>
                      <Calendar className="w-3 h-3" />
                      <span data-ev-id="ev_9ab0584e20">{formatDate(idea.created_at)}</span>
                      {/* Deadline für aktive Abstimmungen */}
                      {['eingereicht', 'abstimmung_laeuft'].includes(idea.status) && idea.voting_deadline && (() => {
                      const deadlineInfo = getDeadlineInfo(idea.voting_deadline);
                      if (!deadlineInfo) return null;
                      return (
                        <>
                            <span data-ev-id="ev_d0627f0fa7">·</span>
                            <Clock className="w-3 h-3" />
                            <span data-ev-id="ev_c7afb8260f" className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${deadlineInfo.color}`}>
                              {deadlineInfo.isExpired ? '⚠ ' : ''}{deadlineInfo.text}
                            </span>
                          </>);

                    })()}
                    </div>

                    {/* Actions */}
                    <div data-ev-id="ev_fdb0a81582" className="flex items-center justify-between pt-3 border-t border-border">
                      <div data-ev-id="ev_0acd1fcdca" className="flex items-center gap-3">
                        <button data-ev-id="ev_f2858810f2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(idea.id, 'up');
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                      idea.user_vote === 'up' ?
                      'bg-green-100 text-green-700' :
                      'hover:bg-muted'}`
                      }>
                          <ThumbsUp className="w-4 h-4" />
                          <span data-ev-id="ev_3f78e93c82" className="text-xs font-medium">{idea.up_votes}</span>
                        </button>
                        <button data-ev-id="ev_c3dfbbaa5e"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote(idea.id, 'down');
                      }}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors ${
                      idea.user_vote === 'down' ?
                      'bg-red-100 text-red-700' :
                      'hover:bg-muted'}`
                      }>
                          <ThumbsDown className="w-4 h-4" />
                          <span data-ev-id="ev_95adeb78e6" className="text-xs font-medium">{idea.down_votes}</span>
                        </button>
                        <span data-ev-id="ev_e3df3781f1" className="text-xs text-muted-foreground">/{totalEligibleVoters}</span>
                      </div>

                      <div data-ev-id="ev_d74ac01b9f" className="flex items-center gap-1 text-muted-foreground">
                        <MessageCircle className="w-4 h-4" />
                        <span data-ev-id="ev_c20a137c79" className="text-sm">{idea.comment_count}</span>
                      </div>
                    </div>
                  </div>
                </div>);

          })}
          </div>
        }

        {/* New Idea Modal */}
        {showNewIdeaModal &&
        <div data-ev-id="ev_90aad77db3" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_da2f6f0d39" className="bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_a7ac73161b" className="flex items-center justify-between p-4 border-b border-border">
                <h2 data-ev-id="ev_1906aa55e6" className="text-lg font-semibold">Neue Idee einreichen</h2>
                <button data-ev-id="ev_3eaeeed00b"
              onClick={() => setShowNewIdeaModal(false)}
              className="p-2 hover:bg-muted rounded-lg">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_5ce93515ec" className="p-4 flex flex-col gap-4">
                <div data-ev-id="ev_7e4823e14e">
                  <label data-ev-id="ev_32dc379768" className="block text-sm font-medium mb-1">Titel *</label>
                  <input data-ev-id="ev_f08a131f2e"
                type="text"
                value={newIdea.title}
                onChange={(e) => setNewIdea({ ...newIdea, title: e.target.value })}
                placeholder="Ihre Idee in einem Satz..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />

                </div>

                <div data-ev-id="ev_d263f4a83c">
                  <label data-ev-id="ev_0af0937f37" className="block text-sm font-medium mb-1">Beschreibung</label>
                  <textarea data-ev-id="ev_669efe5e32"
                value={newIdea.description}
                onChange={(e) => setNewIdea({ ...newIdea, description: e.target.value })}
                placeholder="Beschreiben Sie Ihre Idee genauer..."
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

                </div>

                <div data-ev-id="ev_5518197b7d">
                  <label data-ev-id="ev_6d6ada62a1" className="block text-sm font-medium mb-1">Kategorie</label>
                  <select data-ev-id="ev_bec209f2e8"
                value={newIdea.category}
                onChange={(e) => setNewIdea({ ...newIdea, category: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">

                    {categories.map((cat) =>
                  <option data-ev-id="ev_5e9d3bead9" key={cat.id} value={cat.name}>{cat.name}</option>
                  )}
                  </select>
                </div>

                <div data-ev-id="ev_01833a04ef">
                  <label data-ev-id="ev_25cf238b4e" className="block text-sm font-medium mb-1">Bilder (optional, max. 5 × 5MB)</label>
                  <div data-ev-id="ev_37d927f7c8" className="border-2 border-dashed border-border rounded-lg p-4">
                    <input data-ev-id="ev_9d0711dfd0"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleNewIdeaFileChange}
                  disabled={newIdeaFiles.length >= 5}
                  className="hidden"
                  id="new-idea-image-upload" />

                    <label data-ev-id="ev_537c82738d"
                  htmlFor="new-idea-image-upload"
                  className={`flex flex-col items-center gap-2 cursor-pointer ${newIdeaFiles.length >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}>

                      <ImagePlus className="w-8 h-8 text-muted-foreground" />
                      <span data-ev-id="ev_6728e172b4" className="text-sm text-muted-foreground">
                        {newIdeaFiles.length >= 5 ? 'Maximum erreicht' : 'Bilder auswählen oder hierher ziehen'}
                      </span>
                    </label>
                    {newIdeaFiles.length > 0 &&
                  <div data-ev-id="ev_7b280c0bad" className="mt-3 flex flex-wrap gap-2">
                        {newIdeaFiles.map((file, idx) =>
                    <div data-ev-id="ev_388f463b72" key={idx} className="relative group">
                            <img data-ev-id="ev_944b572c64"
                      src={URL.createObjectURL(file)}
                      alt={`Vorschau ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded-lg border border-border" />

                            <button data-ev-id="ev_4006560df4"
                      type="button"
                      onClick={() => removeNewIdeaFile(idx)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">

                              <X className="w-3 h-3" />
                            </button>
                          </div>
                    )}
                      </div>
                  }
                  </div>
                  <p data-ev-id="ev_2dde0272a4" className="text-xs text-muted-foreground mt-1">
                    {newIdeaFiles.length}/5 Bilder ausgewählt
                  </p>
                </div>

                {/* Poll Options Section */}
                <div data-ev-id="ev_fc0b031a6d" className="border-t border-border pt-4">
                  <div data-ev-id="ev_cfb4c8f840" className="flex items-center justify-between mb-3">
                    <label data-ev-id="ev_deae80e421" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input data-ev-id="ev_a0ad7d3268"
                    type="checkbox"
                    checked={showPollOptions}
                    onChange={(e) => setShowPollOptions(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />

                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      Umfrage hinzufügen
                    </label>
                  </div>
                  
                  {showPollOptions &&
                <div data-ev-id="ev_9e01449507" className="bg-muted/50 rounded-lg p-4">
                      <p data-ev-id="ev_b64eefb70d" className="text-xs text-muted-foreground mb-3">
                        Erstellen Sie eine Umfrage wie bei WhatsApp. Mitglieder können abstimmen.
                      </p>
                      <div data-ev-id="ev_caa49b07b7" className="flex flex-col gap-2">
                        {pollOptions.map((option, idx) =>
                    <div data-ev-id="ev_f3b441cc15" key={idx} className="flex items-center gap-2">
                            <span data-ev-id="ev_d42d50fa4b" className="text-xs text-muted-foreground w-6">{idx + 1}.</span>
                            <input data-ev-id="ev_7cdd56ac8c"
                      type="text"
                      value={option}
                      onChange={(e) => updatePollOption(idx, e.target.value)}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />

                            {pollOptions.length > 2 &&
                      <button data-ev-id="ev_2df765f4d3"
                      type="button"
                      onClick={() => removePollOption(idx)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg">

                                <X className="w-4 h-4" />
                              </button>
                      }
                          </div>
                    )}
                      </div>
                      {pollOptions.length < 10 &&
                  <button data-ev-id="ev_7a0131e7c0"
                  type="button"
                  onClick={addPollOption}
                  className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80">

                          <Plus className="w-4 h-4" />
                          Option hinzufügen
                        </button>
                  }
                      {pollOptions.filter((o) => o.trim()).length < 2 &&
                  <p data-ev-id="ev_b749ef6b5b" className="mt-2 text-xs text-amber-600">
                          Mindestens 2 ausgefüllte Optionen erforderlich
                        </p>
                  }
                    </div>
                }
                </div>
              </div>

              <div data-ev-id="ev_bce17b0177" className="flex justify-end gap-3 p-4 border-t border-border">
                <button data-ev-id="ev_4fe3994282"
              onClick={() => setShowNewIdeaModal(false)}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg">

                  Abbrechen
                </button>
                <button data-ev-id="ev_d107f452dc"
              onClick={handleCreateIdea}
              disabled={!newIdea.title.trim() || submitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Idee einreichen
                </button>
              </div>
            </div>
          </div>
        }

        {/* Idea Detail Modal */}
        {selectedIdea &&
        <div data-ev-id="ev_0c15ce5f39" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_d9ca8dd920" className="bg-card rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_7fb07a02b2" className="sticky top-0 bg-card flex items-center justify-between p-4 border-b border-border z-10">
                <div data-ev-id="ev_93c3e06be1" className="flex items-center gap-2">
                  <span data-ev-id="ev_5b65c0202e"
                className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: getCategoryColor(selectedIdea.category) }}>

                    {selectedIdea.category}
                  </span>
                  <span data-ev-id="ev_106fb432f5" className={`px-2 py-0.5 rounded-full text-xs font-medium ${(STATUS_CONFIG[selectedIdea.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.eingereicht).color}`}>
                    {(STATUS_CONFIG[selectedIdea.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.eingereicht).label}
                  </span>
                </div>
                <button data-ev-id="ev_333f1d765d"
              onClick={() => setSelectedIdea(null)}
              className="p-2 hover:bg-muted rounded-lg">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_9e1e89a772" className="p-4">
                {/* Image Slider */}
                {(selectedIdea.images.length > 0 || selectedIdea.image_url) &&
              <div data-ev-id="ev_000ad09eb6" className="relative aspect-video bg-muted rounded-lg overflow-hidden mb-4 group">
                    <img data-ev-id="ev_f90df1e5ed"
                src={selectedIdea.images[currentImageIndex]?.image_url || selectedIdea.image_url || ''}
                alt={`${selectedIdea.title} - Bild ${currentImageIndex + 1}`}
                className="w-full h-full object-cover" />

                    
                    {/* Slider Navigation */}
                    {selectedIdea.images.length > 1 &&
                <>
                        <button data-ev-id="ev_8850bb2cfc"
                  onClick={() => setCurrentImageIndex((prev) => prev === 0 ? selectedIdea.images.length - 1 : prev - 1)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">

                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button data-ev-id="ev_fa118b1fc0"
                  onClick={() => setCurrentImageIndex((prev) => prev === selectedIdea.images.length - 1 ? 0 : prev + 1)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">

                          <ChevronRight className="w-5 h-5" />
                        </button>
                        
                        {/* Dots Indicator */}
                        <div data-ev-id="ev_07b4860bb3" className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                          {selectedIdea.images.map((_, idx) =>
                    <button data-ev-id="ev_d44dba683c"
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/75'}`} />

                    )}
                        </div>
                      </>
                }
                    
                    {/* Image Counter */}
                    {selectedIdea.images.length > 0 &&
                <div data-ev-id="ev_9cb24f6843" className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                        {currentImageIndex + 1} / {selectedIdea.images.length}
                      </div>
                }
                    
                    {/* Image Voting - Overlay at bottom */}
                    {selectedIdea.images.length > 0 && selectedIdea.images[currentImageIndex] &&
                <div data-ev-id="ev_d26b6df172" className="absolute bottom-3 right-3 flex items-center gap-2 bg-black/70 rounded-lg px-3 py-2">
                        <span data-ev-id="ev_daf1fa6270" className="text-white text-xs mr-1">Bild bewerten:</span>
                        <button data-ev-id="ev_967cb2d7e3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageVote(selectedIdea.images[currentImageIndex].id, 'up');
                  }}
                  disabled={votingImageId === selectedIdea.images[currentImageIndex].id}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                  selectedIdea.images[currentImageIndex].user_vote === 'up' ?
                  'bg-green-500 text-white' :
                  'bg-white/20 text-white hover:bg-white/30'}`
                  }>

                          {votingImageId === selectedIdea.images[currentImageIndex].id ?
                    <Loader2 className="w-4 h-4 animate-spin" /> :

                    <ThumbsUp className="w-4 h-4" />
                    }
                          <span data-ev-id="ev_12e982b36e" className="text-xs font-medium">{selectedIdea.images[currentImageIndex].up_votes}</span>
                        </button>
                        <button data-ev-id="ev_16e7b691e2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageVote(selectedIdea.images[currentImageIndex].id, 'down');
                  }}
                  disabled={votingImageId === selectedIdea.images[currentImageIndex].id}
                  className={`flex items-center gap-1 px-2 py-1 rounded transition-colors disabled:opacity-50 ${
                  selectedIdea.images[currentImageIndex].user_vote === 'down' ?
                  'bg-red-500 text-white' :
                  'bg-white/20 text-white hover:bg-white/30'}`
                  }>

                          <ThumbsDown className="w-4 h-4" />
                          <span data-ev-id="ev_7d613bab92" className="text-xs font-medium">{selectedIdea.images[currentImageIndex].down_votes}</span>
                        </button>
                        {selectedIdea.images[currentImageIndex].id === selectedIdea.thumbnail_image_id &&
                  <span data-ev-id="ev_18fd6d2a03" className="ml-1 text-xs text-green-400 flex items-center gap-1">
                            ★ Thumbnail
                          </span>
                  }
                      </div>
                }
                  </div>
              }

                {/* Image Management for Creator/Admin */}
                {(canManageAll || selectedIdea.created_by === currentUserId) &&
              <div data-ev-id="ev_bac02709a1" className="mb-4">
                    {/* Upload Button */}
                    {selectedIdea.images.length < 5 &&
                <label data-ev-id="ev_0c50f833ff" className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary hover:bg-muted/50 transition-colors">
                        <input data-ev-id="ev_6e3e1f15db"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleImageUpload(selectedIdea.id, e.target.files)}
                  disabled={uploadingImage} />

                        {uploadingImage ?
                  <>
                            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                            <span data-ev-id="ev_e0a91786ca" className="text-sm text-muted-foreground">Wird hochgeladen...</span>
                          </> :

                  <>
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                            <span data-ev-id="ev_f966f0f8e5" className="text-sm text-muted-foreground">Bilder hinzufügen (max. 5, je 5 MB)</span>
                          </>
                  }
                      </label>
                }
                    
                    {/* Image Thumbnails with Delete and Vote Score */}
                    {selectedIdea.images.length > 0 &&
                <div data-ev-id="ev_4301d0fb7d" className="flex flex-wrap gap-2 mt-3">
                        {selectedIdea.images.map((img, idx) => {
                    const isThumbnail = img.id === selectedIdea.thumbnail_image_id;
                    return (
                      <div data-ev-id="ev_77d1052ab3" key={img.id} className="relative group">
                              <img data-ev-id="ev_dabc79ee16"
                        src={img.image_url}
                        alt={`Bild ${idx + 1}`}
                        className={`w-16 h-16 object-cover rounded-lg cursor-pointer border-2 transition-colors ${
                        idx === currentImageIndex ? 'border-primary' :
                        isThumbnail ? 'border-green-500' : 'border-transparent hover:border-muted-foreground'}`
                        }
                        onClick={() => setCurrentImageIndex(idx)} />

                              {/* Vote score badge */}
                              {img.vote_score !== 0 &&
                        <div data-ev-id="ev_005a7dced4" className={`absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        img.vote_score > 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`
                        }>
                                  {img.vote_score > 0 ? '+' : ''}{img.vote_score}
                                </div>
                        }
                              {/* Thumbnail indicator */}
                              {isThumbnail &&
                        <div data-ev-id="ev_d49693c3ed" className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <span data-ev-id="ev_9136b71312" className="text-white text-[8px]">★</span>
                                </div>
                        }
                              <button data-ev-id="ev_eb665c86f9"
                        onClick={() => handleImageDelete(img.id)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">

                                <X className="w-3 h-3" />
                              </button>
                            </div>);

                  })}
                      </div>
                }
                    {selectedIdea.images.length > 1 &&
                <p data-ev-id="ev_372449fad4" className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Vote className="w-3 h-3" />
                        Das Bild mit den meisten Stimmen wird als Vorschaubild in der Übersicht verwendet.
                      </p>
                }
                  </div>
              }

                {/* Poll Display */}
                {selectedIdea.poll &&
              <div data-ev-id="ev_50cad9a5ee" className="mb-4 bg-muted/50 rounded-lg p-4">
                    <div data-ev-id="ev_813f88b7fc" className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-5 h-5 text-primary" />
                      <h3 data-ev-id="ev_81a2f121e9" className="font-semibold text-foreground">Umfrage</h3>
                      <span data-ev-id="ev_9c5d86c7c6" className="text-xs text-muted-foreground">({selectedIdea.poll.total_votes} Stimmen)</span>
                    </div>
                    <div data-ev-id="ev_3ea9b88900" className="flex flex-col gap-2">
                      {selectedIdea.poll.poll.options.map((option, idx) => {
                    const voteData = selectedIdea.poll!.votes.find((v) => v.option_index === idx);
                    const count = voteData?.count || 0;
                    const percentage = selectedIdea.poll!.total_votes > 0 ?
                    Math.round(count / selectedIdea.poll!.total_votes * 100) :
                    0;
                    const isUserVote = selectedIdea.poll!.user_vote === idx;

                    return (
                      <button data-ev-id="ev_b2f04243bd"
                      key={idx}
                      onClick={() => handlePollVote(selectedIdea.poll!.poll.id, idx)}
                      disabled={votingPollId === selectedIdea.poll!.poll.id}
                      className={`relative overflow-hidden rounded-lg border transition-all text-left ${
                      isUserVote ?
                      'border-primary bg-primary/5' :
                      'border-border hover:border-primary/50'}`
                      }>

                            {/* Progress bar background */}
                            <div data-ev-id="ev_1e27a51f8e"
                        className={`absolute inset-0 transition-all ${
                        isUserVote ? 'bg-primary/20' : 'bg-muted'}`
                        }
                        style={{ width: `${percentage}%` }} />

                            
                            {/* Content */}
                            <div data-ev-id="ev_e3e1a9e210" className="relative px-4 py-3 flex items-center justify-between">
                              <div data-ev-id="ev_7186492826" className="flex items-center gap-2">
                                {isUserVote &&
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                            }
                                <span data-ev-id="ev_bf234c8e4e" className={`text-sm ${
                            isUserVote ? 'font-medium text-primary' : 'text-foreground'}`
                            }>
                                  {option}
                                </span>
                              </div>
                              <div data-ev-id="ev_9bd1e925e3" className="flex items-center gap-2">
                                <span data-ev-id="ev_35ab70f1f5" className="text-sm font-semibold">{percentage}%</span>
                                <span data-ev-id="ev_de03946195" className="text-xs text-muted-foreground">({count})</span>
                              </div>
                            </div>
                          </button>);

                  })}
                    </div>
                    {selectedIdea.poll.user_vote !== null &&
                <p data-ev-id="ev_856182df45" className="mt-3 text-xs text-muted-foreground text-center">
                        Klicken Sie erneut auf Ihre Auswahl, um die Stimme zurückzuziehen
                      </p>
                }
                  </div>
              }

                {/* Title & Description */}
                <h2 data-ev-id="ev_044bf8ecff" className="text-xl font-bold text-foreground mb-2">{selectedIdea.title}</h2>
                {selectedIdea.description &&
              <p data-ev-id="ev_2a3845eedd" className="text-muted-foreground mb-4 whitespace-pre-wrap">{selectedIdea.description}</p>
              }

                {/* Meta */}
                <div data-ev-id="ev_1a89d8676b" className="flex items-center gap-4 text-sm text-muted-foreground mb-4 pb-4 border-b border-border">
                  <div data-ev-id="ev_a78cd2ec8a" className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span data-ev-id="ev_003b715822">{selectedIdea.creator_name}</span>
                  </div>
                  <div data-ev-id="ev_48085b188c" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span data-ev-id="ev_f2a2d1c100">{formatDate(selectedIdea.created_at)}</span>
                  </div>
                </div>

                {/* Voting */}
                <div data-ev-id="ev_8e3912fdcc" className="flex flex-col gap-3 mb-6">
                  <div data-ev-id="ev_8ec222abe9" className="flex items-center gap-4">
                    <button data-ev-id="ev_9b99a1dddf"
                  onClick={() => handleVote(selectedIdea.id, 'up')}
                  disabled={votingIdeaId === selectedIdea.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  selectedIdea.user_vote === 'up' ?
                  'bg-green-100 text-green-700' :
                  'bg-muted hover:bg-muted/80'}`
                  }>
                      {votingIdeaId === selectedIdea.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
                      <span data-ev-id="ev_5c93ba6fa7">Dafür</span>
                    </button>
                    <button data-ev-id="ev_ae3ae569a0"
                  onClick={() => handleVote(selectedIdea.id, 'down')}
                  disabled={votingIdeaId === selectedIdea.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                  selectedIdea.user_vote === 'down' ?
                  'bg-red-100 text-red-700' :
                  'bg-muted hover:bg-muted/80'}`
                  }>
                      {votingIdeaId === selectedIdea.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5" />}
                      <span data-ev-id="ev_26b4c97470">Dagegen</span>
                    </button>
                  </div>
                  <div data-ev-id="ev_9fbcf9cd66" className="flex items-center gap-3 text-sm bg-muted/50 px-4 py-2 rounded-lg">
                    <span data-ev-id="ev_781d0c75e0" className="flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4 text-green-600" />
                      <span data-ev-id="ev_e4defae2ba" className="font-semibold text-green-600">{selectedIdea.up_votes}</span>
                    </span>
                    <span data-ev-id="ev_e4b6082dfb" className="text-muted-foreground">|</span>
                    <span data-ev-id="ev_8d5e89f619" className="flex items-center gap-1.5">
                      <ThumbsDown className="w-4 h-4 text-red-600" />
                      <span data-ev-id="ev_3afea61db5" className="font-semibold text-red-600">{selectedIdea.down_votes}</span>
                    </span>
                    <span data-ev-id="ev_d57a5e92c1" className="text-muted-foreground">|</span>
                    <span data-ev-id="ev_8cc1dd71f9" className="text-muted-foreground">
                      von <span data-ev-id="ev_65e512d539" className="font-medium text-foreground">{totalEligibleVoters}</span> Berechtigten
                    </span>
                  </div>
                </div>

                {/* Admin Actions */}
                {(canManageAll || selectedIdea.created_by === currentUserId) &&
              <div data-ev-id="ev_06f53d16b9" className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-border">
                    {canManageAll &&
                <select data-ev-id="ev_66eeac3eee"
                value={selectedIdea.status}
                onChange={(e) => handleStatusChange(selectedIdea, e.target.value as Idea['status'])}
                className="px-3 py-2 bg-background border border-border rounded-lg text-sm">

                        {Object.entries(STATUS_CONFIG).map(([key, config]) =>
                            <option data-ev-id="ev_279583f33d" key={key} value={key}>{config.label}</option>
                          )}
                      </select>
                }
                {/* PDF Download for approved ideas */}
                {canManageAll && ['abstimmung_laeuft', 'wird_umgesetzt', 'umgesetzt'].includes(selectedIdea.status) &&
                <button data-ev-id="ev_24867cbcd7"
                onClick={() => handleDownloadApprovalPdf(selectedIdea)}
                disabled={generatingPdf}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-sm disabled:opacity-50">
                  {generatingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Freigabe-PDF
                </button>
                }
                {/* Deadline Editor */}
                {canManageAll && ['eingereicht', 'abstimmung_laeuft'].includes(selectedIdea.status) &&
                <div data-ev-id="ev_fa07d26edb" className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span data-ev-id="ev_92491df6e1" className="text-sm text-muted-foreground">Frist:</span>
                    <input data-ev-id="ev_dcfadb6ee3"
                  type="date"
                  value={selectedIdea.voting_deadline ? new Date(selectedIdea.voting_deadline).toISOString().split('T')[0] : ''}
                  onChange={async (e) => {
                    if (e.target.value) {
                      const newDeadline = new Date(e.target.value);
                      await updateVotingDeadline(selectedIdea.id, newDeadline);
                    }
                  }}
                  className="px-2 py-1 bg-background border border-border rounded-lg text-sm" />

                  </div>
                }
                    {selectedIdea.created_by === currentUserId &&
                <>
                        <button data-ev-id="ev_1b4f20f99f"
                  onClick={() => {
                    setEditingIdea(selectedIdea);
                    setSelectedIdea(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm">

                          <Edit2 className="w-4 h-4" />
                          Bearbeiten
                        </button>
                        <button data-ev-id="ev_345e4cd4d2"
                  onClick={() => handleDeleteIdea(selectedIdea)}
                  className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm">

                          <Trash2 className="w-4 h-4" />
                          Löschen
                        </button>
                      </>
                }
                  </div>
              }

                {/* Comments */}
                <div data-ev-id="ev_11646f1acd">
                  <h3 data-ev-id="ev_7b1f79992c" className="font-semibold mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Kommentare ({comments.length})
                  </h3>

                  {loadingComments ?
                <div data-ev-id="ev_cae238946c" className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div> :

                <>
                      {comments.length === 0 ?
                  <p data-ev-id="ev_7d0405df61" className="text-muted-foreground text-sm py-4">Noch keine Kommentare. Seien Sie der Erste!</p> :

                  <div data-ev-id="ev_b1b8f6ba79" className="flex flex-col gap-3 mb-4">
                          {comments.map((comment) =>
                    <div data-ev-id="ev_0e1205ecdc" key={comment.id} className="bg-muted rounded-lg p-3">
                              <div data-ev-id="ev_1531c4b54d" className="flex items-center justify-between mb-2">
                                <span data-ev-id="ev_a645a5f60d" className="font-medium text-sm">{comment.user_name}</span>
                                <div data-ev-id="ev_fc884ce5a3" className="flex items-center gap-2">
                                  <span data-ev-id="ev_d0919a7754" className="text-xs text-muted-foreground">
                                    {formatDate(comment.created_at)}
                                  </span>
                                  {comment.user_id === currentUserId &&
                          <button data-ev-id="ev_81b318c5f1"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1 text-muted-foreground hover:text-red-600">

                                      <Trash2 className="w-3 h-3" />
                                    </button>
                          }
                                </div>
                              </div>
                              <p data-ev-id="ev_80583d4913" className="text-sm whitespace-pre-wrap">{comment.content}</p>
                            </div>
                    )}
                        </div>
                  }

                      {/* Add Comment */}
                      <div data-ev-id="ev_a7a72fd137" className="flex gap-2">
                        <input data-ev-id="ev_77ec68dc01"
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Kommentar hinzufügen..."
                    disabled={addingComment}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleAddComment();
                      }
                    }} />

                        <button data-ev-id="ev_31fb85ec76"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || addingComment}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                          {addingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                      </div>
                    </>
                }
                </div>
              </div>
            </div>
          </div>
        }

        {/* Edit Idea Modal */}
        {editingIdea &&
        <div data-ev-id="ev_55f4e4ef64" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_c3ad473f82" className="bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_53cca11a96" className="flex items-center justify-between p-4 border-b border-border">
                <h2 data-ev-id="ev_b8f2e1f287" className="text-lg font-semibold">Idee bearbeiten</h2>
                <button data-ev-id="ev_368861c762"
              onClick={() => setEditingIdea(null)}
              className="p-2 hover:bg-muted rounded-lg">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_9e2ae0e06f" className="p-4 flex flex-col gap-4">
                <div data-ev-id="ev_1a774dd79b">
                  <label data-ev-id="ev_393607f285" className="block text-sm font-medium mb-1">Titel *</label>
                  <input data-ev-id="ev_a768e1efb2"
                type="text"
                value={editingIdea.title}
                onChange={(e) => setEditingIdea({ ...editingIdea, title: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />

                </div>

                <div data-ev-id="ev_5cd654661b">
                  <label data-ev-id="ev_05d28672d3" className="block text-sm font-medium mb-1">Beschreibung</label>
                  <textarea data-ev-id="ev_a88b410ba2"
                value={editingIdea.description || ''}
                onChange={(e) => setEditingIdea({ ...editingIdea, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

                </div>

                <div data-ev-id="ev_f3c2a150d5">
                  <label data-ev-id="ev_2bf6b1f9af" className="block text-sm font-medium mb-1">Kategorie</label>
                  <select data-ev-id="ev_001a650993"
                value={editingIdea.category}
                onChange={(e) => setEditingIdea({ ...editingIdea, category: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">

                    {categories.map((cat) =>
                  <option data-ev-id="ev_07c72ed5a8" key={cat.id} value={cat.name}>{cat.name}</option>
                  )}
                  </select>
                </div>

                {/* Existing Images */}
                <div data-ev-id="ev_294e9cd105">
                  <label data-ev-id="ev_3cd9d1389d" className="block text-sm font-medium mb-1">Bilder ({editingIdea.images.length}/5)</label>
                  {editingIdea.images.length > 0 &&
                <div data-ev-id="ev_068b6783ae" className="flex flex-wrap gap-2 mb-3">
                      {editingIdea.images.map((img) =>
                  <div data-ev-id="ev_5f12b981ae" key={img.id} className="relative group">
                          <img data-ev-id="ev_8a044589ce"
                    src={img.image_url}
                    alt="Idee Bild"
                    className="w-20 h-20 object-cover rounded-lg border border-border" />

                          <button data-ev-id="ev_b72a187afc"
                    type="button"
                    onClick={async () => {
                      if (window.confirm('Bild löschen?')) {
                        await deleteIdeaImage(img.id);
                        setEditingIdea({
                          ...editingIdea,
                          images: editingIdea.images.filter((i) => i.id !== img.id)
                        });
                      }
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">

                            <X className="w-3 h-3" />
                          </button>
                          {img.vote_score > 0 &&
                    <div data-ev-id="ev_0a83a48100" className="absolute bottom-1 left-1 bg-green-500/90 text-white text-[10px] px-1 rounded flex items-center gap-0.5">
                              <ThumbsUp className="w-2 h-2" />
                              {img.vote_score}
                            </div>
                    }
                        </div>
                  )}
                    </div>
                }
                  {editingIdea.images.length < 5 &&
                <div data-ev-id="ev_042b598c6f" className="border-2 border-dashed border-border rounded-lg p-3">
                      <input data-ev-id="ev_43a1d386ee"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size <= 5 * 1024 * 1024) {
                      setUploadingImage(true);
                      await uploadIdeaImage(editingIdea.id, file);
                      setUploadingImage(false);
                    }
                    e.target.value = '';
                  }}
                  disabled={uploadingImage}
                  className="hidden"
                  id="edit-idea-image-upload" />

                      <label data-ev-id="ev_5b0790fee8"
                  htmlFor="edit-idea-image-upload"
                  className={`flex items-center justify-center gap-2 cursor-pointer ${uploadingImage ? 'opacity-50' : ''}`}>

                        {uploadingImage ?
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> :

                    <ImagePlus className="w-5 h-5 text-muted-foreground" />
                    }
                        <span data-ev-id="ev_a4fdcfd11c" className="text-sm text-muted-foreground">
                          {uploadingImage ? 'Wird hochgeladen...' : 'Bild hinzufügen (max. 5MB)'}
                        </span>
                      </label>
                    </div>
                }
                </div>
              </div>

              <div data-ev-id="ev_510e0b9d46" className="flex justify-end gap-3 p-4 border-t border-border">
                <button data-ev-id="ev_c4428cfce8"
              onClick={() => setEditingIdea(null)}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg">

                  Abbrechen
                </button>
                <button data-ev-id="ev_57b3a6bcae"
              onClick={handleUpdateIdea}
              disabled={!editingIdea.title.trim() || submitting}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">

                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Speichern
                </button>
              </div>
            </div>
          </div>
        }

        {/* Task Creation Modal */}
        {showTaskModal && ideaForTask &&
        <div data-ev-id="ev_5abde3a43c" className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div data-ev-id="ev_985ca5e857" className="bg-card rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div data-ev-id="ev_35324865f3" className="flex items-center justify-between p-4 border-b border-border">
                <div data-ev-id="ev_786e986630" className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5 text-primary" />
                  <h2 data-ev-id="ev_256b1596a6" className="text-lg font-semibold">Aufgabe erstellen</h2>
                </div>
                <button data-ev-id="ev_170989cc80"
              onClick={() => {
                setShowTaskModal(false);
                setIdeaForTask(null);
              }}
              className="p-2 hover:bg-muted rounded-lg">

                  <X className="w-5 h-5" />
                </button>
              </div>

              <div data-ev-id="ev_faf9db509a" className="p-4">
                <div data-ev-id="ev_62a14b9bdc" className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-4">
                  <p data-ev-id="ev_fbf1e46cd3" className="text-sm text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 inline mr-2" />
                    Die Idee <strong data-ev-id="ev_e9dbdf1869">"{ideaForTask.title}"</strong> wird genehmigt und eine Aufgabe zur Umsetzung erstellt.
                  </p>
                </div>

                <div data-ev-id="ev_db5bfdf6d6" className="flex flex-col gap-4">
                  <div data-ev-id="ev_ea756a99ab">
                    <label data-ev-id="ev_3ab37b6035" className="block text-sm font-medium mb-1">Aufgabentitel *</label>
                    <input data-ev-id="ev_b41c197d63"
                  type="text"
                  value={taskData.title}
                  onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />

                  </div>

                  <div data-ev-id="ev_ff3d0e2b77">
                    <label data-ev-id="ev_9eb3bdad51" className="block text-sm font-medium mb-1">Beschreibung</label>
                    <textarea data-ev-id="ev_4e9358cbe8"
                  value={taskData.description}
                  onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />

                  </div>

                  <div data-ev-id="ev_4c177888ac">
                    <label data-ev-id="ev_2b10870a52" className="block text-sm font-medium mb-1">Zustaendig</label>
                    <select data-ev-id="ev_ec40f1b00d"
                  value={taskData.assigned_to}
                  onChange={(e) => setTaskData({ ...taskData, assigned_to: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">

                      <option data-ev-id="ev_6330e1b9a5" value="">-- Nicht zugewiesen --</option>
                      {profiles.map((p) =>
                    <option data-ev-id="ev_033cde5df0" key={p.id} value={p.id}>{p.full_name}</option>
                    )}
                    </select>
                  </div>

                  <div data-ev-id="ev_a0acf6fb0b">
                    <label data-ev-id="ev_bb2da04141" className="block text-sm font-medium mb-1">Faellig bis *</label>
                    <input data-ev-id="ev_884396f3fc"
                  type="date"
                  value={taskData.end_date}
                  onChange={(e) => setTaskData({ ...taskData, end_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" />

                  </div>
                </div>
              </div>

              <div data-ev-id="ev_0c4976638e" className="flex justify-end gap-3 p-4 border-t border-border">
                <button data-ev-id="ev_e366d29f2e"
              onClick={() => {
                setShowTaskModal(false);
                setIdeaForTask(null);
              }}
              className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg">

                  Abbrechen
                </button>
                <button data-ev-id="ev_6ad499a035"
              onClick={handleCreateTaskForIdea}
              disabled={!taskData.title.trim() || !taskData.end_date || creatingTask}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">

                  {creatingTask && <Loader2 className="w-4 h-4 animate-spin" />}
                  <CheckCircle2 className="w-4 h-4" />
                  Genehmigen & Aufgabe erstellen
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </Layout>);

}