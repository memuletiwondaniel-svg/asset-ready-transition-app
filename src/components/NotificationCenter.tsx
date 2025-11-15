import React from 'react';
import { Bell, Check, Loader2, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
export const NotificationCenter: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useNotifications();
  return <Popover>
      <PopoverTrigger asChild>
        
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 backdrop-blur-xl bg-background/98 shadow-2xl border-border/40" align="end">
        <CardHeader className="border-b border-border/40 bg-gradient-to-r from-primary/5 to-accent/5 py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Notifications</CardTitle>
            {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7 px-3 hover:bg-primary/10">
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Mark all read
              </Button>}
          </div>
        </CardHeader>

        <ScrollArea className="h-[400px]">
          {loading ? <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div> : notifications.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="w-16 h-16 mb-3 opacity-30" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs">You're all caught up!</p>
            </div> : <div className="p-2 space-y-2">
              {notifications.map((notification, idx) => <Card key={notification.id} className={`border-border/40 hover:border-primary/30 transition-all duration-300 cursor-pointer group animate-smooth-in ${notification.status === 'PENDING' ? 'bg-primary/5' : ''}`} style={{
            animationDelay: `${idx * 30}ms`
          }} onClick={() => notification.status === 'PENDING' && markAsRead(notification.id)}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                          {notification.title}
                          {notification.status === 'PENDING' && <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />}
                        </h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {notification.content}
                        </p>
                      </div>
                      {notification.status === 'PENDING' && <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => {
                  e.stopPropagation();
                  markAsRead(notification.id);
                }}>
                          <Check className="w-4 h-4" />
                        </Button>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        {notification.type}
                      </Badge>
                      <span>•</span>
                      <span>
                        {formatDistanceToNow(new Date(notification.created_at), {
                    addSuffix: true
                  })}
                      </span>
                    </div>
                  </CardContent>
                </Card>)}
            </div>}
        </ScrollArea>
      </PopoverContent>
    </Popover>;
};