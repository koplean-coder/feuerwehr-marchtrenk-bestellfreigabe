import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useNotifications, type Notification } from '@/contexts/NotificationsContext';
import { useProfiles } from '@/hooks/useProfiles';
import { useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { Bell, Check, CheckCheck, Clock, ShoppingCart, Archive, ChevronDown, ChevronUp, ListTodo, CheckSquare, MessageSquare, Lightbulb } from 'lucide-react';

export default function Notifications() {
  const { notifications, loading, markAsRead, markAllAsRead, unreadCount } = useNotifications();
  const { profiles } = useProfiles();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showArchive, setShowArchive] = useState(false);

  // Trennung in ungelesene und gelesene Benachrichtigungen
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const readNotifications = notifications.filter((n) => n.is_read);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get sender name from profiles
  function getSenderName(senderId: string | null) {
    if (!senderId) return 'Unbekannt';
    const sender = profiles.find((p) => p.id === senderId);
    return sender?.full_name || sender?.email || 'Unbekannt';
  }

  // Get icon and color based on notification type
  function getNotificationStyle(notification: Notification) {
    switch (notification.notification_type) {
      case 'task':
        return {
          icon: ListTodo,
          bgColor: 'bg-blue-500/10',
          iconColor: 'text-blue-500',
          link: '/aufgaben',
          linkText: 'Zu den Aufgaben',
          isMessage: false
        };
      case 'step':
        return {
          icon: CheckSquare,
          bgColor: 'bg-purple-500/10',
          iconColor: 'text-purple-500',
          link: '/aufgaben',
          linkText: 'Zu den Aufgaben',
          isMessage: false
        };
      case 'message':
        return {
          icon: MessageSquare,
          bgColor: 'bg-green-500/10',
          iconColor: 'text-green-500',
          link: '',
          linkText: 'Nachricht öffnen',
          isMessage: true
        };
      case 'problem_report':
        return {
          icon: Bell,
          bgColor: 'bg-red-500/10',
          iconColor: 'text-red-500',
          link: '/einstellungen?section=probleme',
          linkText: 'Zu den Problemmeldungen',
          isMessage: false
        };
      case 'idea':
        return {
          icon: Lightbulb,
          bgColor: 'bg-amber-500/10',
          iconColor: 'text-amber-500',
          link: '/ideenpool',
          linkText: 'Zum Ideen-Pool',
          isMessage: false
        };
      case 'order':
      default:
        // If no order_id, treat as message (for backwards compatibility)
        if (!notification.order_id) {
          return {
            icon: MessageSquare,
            bgColor: 'bg-green-500/10',
            iconColor: 'text-green-500',
            link: '',
            linkText: 'Nachricht öffnen',
            isMessage: true
          };
        }
        return {
          icon: ShoppingCart,
          bgColor: 'bg-primary/10',
          iconColor: 'text-primary',
          link: notification.order_id ? `/bestellungen/${notification.order_id}` : '/bestellungen',
          linkText: 'Zur Bestellung',
          isMessage: false
        };
    }
  }

  // Open message in Index page conversation modal
  function openMessage(notification: Notification) {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    // Build conversation key: subject::sorted_participants
    const subject = notification.subject || 'Kein Betreff';
    const participants = [...(notification.original_recipients || [])].sort().join(',');
    const conversationKey = `${subject}::${participants}`;

    // Navigate to Index with the conversation key as query param
    navigate(`/?openConversation=${encodeURIComponent(conversationKey)}`);
  }

  function NotificationItem({ notification, isRead }: {notification: Notification;isRead: boolean;}) {
    const style = getNotificationStyle(notification);
    const IconComponent = style.icon;

    const handleLinkClick = () => {
      if (!isRead) {
        markAsRead(notification.id);
      }
    };

    const handleMessageClick = () => {
      openMessage(notification);
    };

    const handleCardClick = () => {
      if (style.isMessage) {
        handleMessageClick();
      } else if (style.link) {
        handleLinkClick();
        navigate(style.link);
      }
    };

    return (
      <div 
        data-ev-id="ev_335ed7e6f2" 
        className={`p-4 transition-colors cursor-pointer hover:bg-muted/50 ${!isRead ? 'bg-primary/5' : ''}`}
        onClick={handleCardClick}
      >
        <div data-ev-id="ev_fa7e7c2848" className="flex items-start gap-4">
          <div data-ev-id="ev_e1d4f0c40b" className={`w-10 h-10 rounded-full flex items-center justify-center ${style.bgColor}`}>
            <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
          </div>
          <div data-ev-id="ev_7c7b0ef18e" className="flex-1 min-w-0">
            {notification.notification_type === 'message' && notification.sender_id &&
            <p data-ev-id="ev_46d22c3f0e" className="text-xs text-muted-foreground mb-1">
                Von: {getSenderName(notification.sender_id)}
                {notification.is_reply && <span data-ev-id="ev_d719a604f9" className="ml-2 text-green-600">(Antwort)</span>}
              </p>
            }
            {notification.subject &&
            <p data-ev-id="ev_subject_line" className="text-sm font-medium text-foreground mb-1">
                {notification.subject}
              </p>
            }
            <p data-ev-id="ev_8e2603901c" className={`${!isRead ? 'font-medium' : ''} text-foreground`}>
              {notification.message}
            </p>
            <div data-ev-id="ev_2e0dcda07d" className="flex items-center gap-4 mt-2">
              <span data-ev-id="ev_f23464a5c0" className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDate(notification.created_at)}
              </span>
              {style.isMessage ?
              <button
                data-ev-id="ev_13a8dc2e15"
                onClick={handleMessageClick}
                className="text-sm text-primary hover:underline flex items-center gap-1">

                  <MessageSquare className="w-3 h-3" />
                  {style.linkText}
                </button> :

              <Link
                to={style.link}
                onClick={handleLinkClick}
                className="text-sm text-primary hover:underline">

                  {style.linkText}
                </Link>
              }
            </div>
          </div>
          {!isRead &&
          <button
            data-ev-id="ev_6cf69cfaf0"
            onClick={() => markAsRead(notification.id)}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Als gelesen markieren">

              <Check className="w-4 h-4" />
            </button>
          }
        </div>
      </div>);

  }

  if (loading) {
    return (
      <Layout>
        <div data-ev-id="ev_14e7a85331" className="flex items-center justify-center min-h-[400px]">
          <div data-ev-id="ev_070c2b39d0" className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      </Layout>);

  }

  return (
    <Layout>
      <div data-ev-id="ev_9ab4276c79" className="max-w-2xl mx-auto">
        {/* Page Header Card */}
        <div data-ev-id="ev_ecaa0cf3d7" className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl p-5 text-white shadow-lg mb-6">
          <div data-ev-id="ev_8551382ce0" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div data-ev-id="ev_82f14268fd" className="flex items-center gap-4">
              <div data-ev-id="ev_356667450a" className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div data-ev-id="ev_91e03ee196">
                <h1 data-ev-id="ev_49d8d91f2f" className="text-xl font-bold">Benachrichtigungen</h1>
                <p data-ev-id="ev_11e61e553d" className="text-sm text-white/80">
                  {unreadCount > 0 ? `${unreadCount} neue Nachricht${unreadCount !== 1 ? 'en' : ''}` : 'Keine neuen Nachrichten'}
                </p>
              </div>
            </div>
            {unreadCount > 0 &&
            <button data-ev-id="ev_e512451676"
            onClick={markAllAsRead}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-amber-600 rounded-xl font-medium hover:bg-white/90 transition-colors shadow-lg">

                <CheckCheck className="w-4 h-4" />
                Alle gelesen
              </button>
            }
          </div>
        </div>

        {/* Ungelesene Benachrichtigungen */}
        {unreadNotifications.length === 0 ?
        <div data-ev-id="ev_ad0274c4d8" className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100 p-8 sm:p-12">
            <div data-ev-id="ev_f3f704bf41" className="flex flex-col items-center text-center">
              <div data-ev-id="ev_66f84037e2" className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-5 relative">
                <Bell className="w-10 h-10 text-amber-500" />
                <div data-ev-id="ev_0b0d28e23a" className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              </div>
              <h3 data-ev-id="ev_8e26cecfba" className="text-lg font-semibold text-amber-700 mb-2">Alles erledigt!</h3>
              <p data-ev-id="ev_a609adfaaf" className="text-amber-600/80 text-sm max-w-xs">
                Sie haben keine neuen Benachrichtigungen. Entspannen Sie sich! 🎉
              </p>
            </div>
          </div> :

        <div data-ev-id="ev_633812803f" className="bg-card rounded-xl border border-border overflow-hidden">
            <div data-ev-id="ev_46a7e1edce" className="px-4 py-3 bg-muted/50 border-b border-border flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span data-ev-id="ev_5441cee93f" className="font-medium text-sm text-foreground">Neue Benachrichtigungen</span>
              <span data-ev-id="ev_f07e2cbec0" className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {unreadNotifications.length}
              </span>
            </div>
            <div data-ev-id="ev_22b4bb7bf0" className="divide-y divide-border">
              {unreadNotifications.map((notification) =>
            <NotificationItem key={notification.id} notification={notification} isRead={false} />
            )}
            </div>
          </div>
        }

        {/* Archiv - Gelesene Benachrichtigungen */}
        {readNotifications.length > 0 &&
        <div data-ev-id="ev_e614026521" className="mt-6">
            <div data-ev-id="ev_d483185a72" className="bg-card rounded-xl border border-border overflow-hidden">
              <button data-ev-id="ev_99aac049a2"
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 w-full px-4 py-3 bg-muted/50 border-b border-border hover:bg-muted transition-colors">

                <Archive className="w-4 h-4 text-muted-foreground" />
                <span data-ev-id="ev_6a6f371113" className="font-medium text-sm text-foreground flex-1 text-left">Archiv</span>
                <span data-ev-id="ev_3e0484d270" className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                  {readNotifications.length}
                </span>
                {showArchive ?
              <ChevronUp className="w-4 h-4 text-muted-foreground ml-2" /> :

              <ChevronDown className="w-4 h-4 text-muted-foreground ml-2" />
              }
              </button>

              {showArchive &&
            <div data-ev-id="ev_7a8e8224a4" className="divide-y divide-border">
                  {readNotifications.map((notification) =>
              <NotificationItem key={notification.id} notification={notification} isRead={true} />
              )}
                </div>
            }
            </div>
          </div>
        }
      </div>
    </Layout>);

}