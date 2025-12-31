import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { 
  MessageCircle, Clock, CheckCircle, AlertCircle, Search, 
  Send, ChevronDown, ChevronUp, User, Mail, Phone, UserPlus, Image, ExternalLink 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Collapsible, CollapsibleContent, CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
  attachments: string[] | null;
}

interface UserProfile {
  full_name: string | null;
  email: string | null;
  phone: string | null;
}

interface AdminUser {
  user_id: string;
  full_name: string | null;
}

const categories: Record<string, string> = {
  booking: "Booking Issues",
  payment: "Payment & Refunds",
  account: "Account & Profile",
  salon: "Salon Related",
  technical: "Technical Issues",
  feedback: "Feedback & Suggestions",
  other: "Other",
};

const SupportTicketManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Fetch all tickets
  const { data: tickets, isLoading } = useQuery({
    queryKey: ["admin-support-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  // Fetch admin users for assignment
  const { data: adminUsers } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Get all admin user IDs
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      
      if (roleError) throw roleError;
      if (!roleData || roleData.length === 0) return [];

      const adminUserIds = roleData.map(r => r.user_id);
      
      // Get profiles for these admins
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", adminUserIds);
      
      if (profileError) throw profileError;
      
      return (profileData || []).map(p => ({
        user_id: p.user_id,
        full_name: p.full_name || "Admin",
      })) as AdminUser[];
    },
  });

  // Fetch user profiles for tickets
  const { data: userProfiles } = useQuery({
    queryKey: ["ticket-user-profiles", tickets?.map(t => t.user_id)],
    queryFn: async () => {
      if (!tickets || tickets.length === 0) return {};
      
      const userIds = [...new Set(tickets.map(t => t.user_id))];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", userIds);
      
      if (error) throw error;
      
      const profileMap: Record<string, UserProfile> = {};
      data?.forEach(p => {
        profileMap[p.user_id] = {
          full_name: p.full_name,
          email: p.email,
          phone: p.phone,
        };
      });
      return profileMap;
    },
    enabled: !!tickets && tickets.length > 0,
  });

  // Update ticket mutation
  const updateTicket = useMutation({
    mutationFn: async ({ 
      ticketId, 
      updates,
      sendEmail = false,
      ticketData,
    }: { 
      ticketId: string; 
      updates: Partial<SupportTicket>;
      sendEmail?: boolean;
      ticketData?: SupportTicket;
    }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update(updates)
        .eq("id", ticketId);
      
      if (error) throw error;

      // Send email notification if this is a response
      if (sendEmail && ticketData && updates.admin_response) {
        try {
          await supabase.functions.invoke("send-ticket-response", {
            body: {
              ticket_id: ticketId,
              ticket_number: ticketData.ticket_number,
              subject: ticketData.subject,
              category: ticketData.category,
              user_message: ticketData.message,
              admin_response: updates.admin_response,
              status: updates.status || ticketData.status,
              user_id: ticketData.user_id,
            },
          });
        } catch (emailError) {
          console.error("Failed to send email notification:", emailError);
          // Don't throw - ticket was updated successfully
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update ticket");
    },
  });

  // Send response
  const handleSendResponse = (ticket: SupportTicket) => {
    const response = responses[ticket.id];
    if (!response?.trim()) {
      toast.error("Please enter a response");
      return;
    }

    updateTicket.mutate({
      ticketId: ticket.id,
      updates: {
        admin_response: response,
        responded_at: new Date().toISOString(),
        status: "in_progress",
      },
      sendEmail: true,
      ticketData: ticket,
    });
    setResponses(prev => ({ ...prev, [ticket.id]: "" }));
  };

  // Resolve ticket
  const handleResolve = (ticketId: string) => {
    updateTicket.mutate({
      ticketId,
      updates: {
        status: "resolved",
        resolved_at: new Date().toISOString(),
      },
    });
  };

  // Close ticket
  const handleClose = (ticketId: string) => {
    updateTicket.mutate({
      ticketId,
      updates: {
        status: "closed",
      },
    });
  };

  // Reopen ticket
  const handleReopen = (ticketId: string) => {
    updateTicket.mutate({
      ticketId,
      updates: {
        status: "open",
        resolved_at: null,
      },
    });
  };

  // Assign ticket
  const handleAssign = (ticketId: string, assignedTo: string | null) => {
    updateTicket.mutate({
      ticketId,
      updates: {
        assigned_to: assignedTo,
      },
    });
  };

  // Get admin name by ID
  const getAdminName = (userId: string | null) => {
    if (!userId) return null;
    const admin = adminUsers?.find(a => a.user_id === userId);
    return admin?.full_name || "Unknown";
  };

  // Filter tickets
  const filteredTickets = tickets?.filter(ticket => {
    const matchesSearch = 
      ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
    
    const matchesAssignee = 
      assigneeFilter === "all" || 
      (assigneeFilter === "unassigned" && !ticket.assigned_to) ||
      ticket.assigned_to === assigneeFilter;
    
    return matchesSearch && matchesStatus && matchesAssignee;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-blue-500">Open</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case "resolved":
        return <Badge className="bg-green-500">Resolved</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "normal":
        return <Badge variant="outline">Normal</Badge>;
      case "low":
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <MessageCircle className="h-4 w-4 text-blue-500" />;
      case "in_progress":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const openCount = tickets?.filter(t => t.status === "open").length || 0;
  const inProgressCount = tickets?.filter(t => t.status === "in_progress").length || 0;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{tickets?.length || 0}</p>
            <p className="text-xs text-muted-foreground">Total Tickets</p>
          </CardContent>
        </Card>
        <Card className={openCount > 0 ? "border-blue-500/50 bg-blue-500/5" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{openCount}</p>
            <p className="text-xs text-muted-foreground">Open</p>
          </CardContent>
        </Card>
        <Card className={inProgressCount > 0 ? "border-yellow-500/50 bg-yellow-500/5" : ""}>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {tickets?.filter(t => t.status === "resolved").length || 0}
            </p>
            <p className="text-xs text-muted-foreground">Resolved</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Filter by assignee" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Assignees</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {adminUsers?.map(admin => (
              <SelectItem key={admin.user_id} value={admin.user_id}>
                {admin.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tickets List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No tickets found</h3>
            <p className="text-muted-foreground text-sm">
              {statusFilter !== "all" 
                ? `No ${statusFilter} tickets match your search`
                : "No support tickets yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const isExpanded = expandedTicket === ticket.id;
            const userProfile = userProfiles?.[ticket.user_id];

            return (
              <Collapsible
                key={ticket.id}
                open={isExpanded}
                onOpenChange={() => setExpandedTicket(isExpanded ? null : ticket.id)}
              >
                <Card className={isExpanded ? "ring-1 ring-primary/20" : ""}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {getStatusIcon(ticket.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm truncate">
                                {ticket.subject}
                              </p>
                              {getStatusBadge(ticket.status)}
                              {getPriorityBadge(ticket.priority)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {ticket.ticket_number} • {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                            {userProfile && (
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {userProfile.full_name || "Unknown"}
                                </span>
                                {userProfile.phone && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {userProfile.phone}
                                  </span>
                                )}
                                {ticket.assigned_to && (
                                  <span className="flex items-center gap-1 text-primary">
                                    <UserPlus className="h-3 w-3" />
                                    {getAdminName(ticket.assigned_to)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="shrink-0">
                            {categories[ticket.category] || ticket.category}
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4 space-y-4">
                      {/* User Message */}
                      <div className="p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          User Message:
                        </p>
                        <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                        
                        {/* Attachments */}
                        {ticket.attachments && ticket.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <Image className="h-3 w-3" />
                              Attachments ({ticket.attachments.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {ticket.attachments.map((url, idx) => {
                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
                                return isImage ? (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-20 h-20 rounded-lg overflow-hidden border border-border hover:ring-2 ring-primary transition-all"
                                  >
                                    <img
                                      src={url}
                                      alt={`Attachment ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ) : (
                                  <a
                                    key={idx}
                                    href={url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                    File {idx + 1}
                                  </a>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Previous Response */}
                      {ticket.admin_response && (
                        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-xs font-medium text-primary mb-2">
                            Your Response:
                          </p>
                          <p className="text-sm whitespace-pre-wrap">{ticket.admin_response}</p>
                          {ticket.responded_at && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Sent {format(new Date(ticket.responded_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Assignment */}
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Assign to:</span>
                        <Select 
                          value={ticket.assigned_to || "unassigned"} 
                          onValueChange={(value) => handleAssign(ticket.id, value === "unassigned" ? null : value)}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select admin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Unassigned</SelectItem>
                            {adminUsers?.map(admin => (
                              <SelectItem key={admin.user_id} value={admin.user_id}>
                                {admin.full_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Response Form */}
                      {ticket.status !== "closed" && (
                        <div className="space-y-3">
                          <Textarea
                            placeholder="Type your response..."
                            value={responses[ticket.id] || ""}
                            onChange={(e) => setResponses(prev => ({ 
                              ...prev, 
                              [ticket.id]: e.target.value 
                            }))}
                            rows={3}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleSendResponse(ticket)}
                              disabled={!responses[ticket.id]?.trim() || updateTicket.isPending}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {ticket.admin_response ? "Update Response" : "Send Response"}
                            </Button>
                            {ticket.status !== "resolved" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-500/10"
                                onClick={() => handleResolve(ticket.id)}
                                disabled={updateTicket.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Resolved
                              </Button>
                            )}
                            {ticket.status === "resolved" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleClose(ticket.id)}
                                  disabled={updateTicket.isPending}
                                >
                                  Close Ticket
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleReopen(ticket.id)}
                                  disabled={updateTicket.isPending}
                                >
                                  Reopen
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {ticket.status === "closed" && (
                        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            This ticket has been closed
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleReopen(ticket.id)}
                            disabled={updateTicket.isPending}
                          >
                            Reopen Ticket
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupportTicketManagement;
