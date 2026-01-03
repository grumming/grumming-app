import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, MessageCircle, Clock, CheckCircle, AlertCircle, ExternalLink, Phone, Mail, FileImage } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { FAQSection } from "@/components/support/FAQSection";
import { TicketStatusTracker } from "@/components/support/TicketStatusTracker";
import { LiveChatWidget } from "@/components/support/LiveChatWidget";
import { DragDropAttachments } from "@/components/support/DragDropAttachments";

const categories = [
  { value: "booking", label: "Booking Issues" },
  { value: "payment", label: "Payment & Refunds" },
  { value: "account", label: "Account & Profile" },
  { value: "salon", label: "Salon Related" },
  { value: "technical", label: "Technical Issues" },
  { value: "feedback", label: "Feedback & Suggestions" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low", description: "General inquiries" },
  { value: "normal", label: "Normal", description: "Standard support" },
  { value: "high", label: "High", description: "Urgent issues" },
];

interface SupportTicket {
  id: string;
  ticket_number: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_response: string | null;
  responded_at: string | null;
  resolved_at: string | null;
  created_at: string;
  attachments: string[] | null;
}

const ContactSupport = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("normal");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);

  // Fetch user's tickets (explicitly exclude internal_notes which is admin-only)
  const { data: tickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ["support-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("support_tickets")
        .select("id, ticket_number, category, subject, message, status, priority, admin_response, responded_at, resolved_at, created_at, attachments")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as SupportTicket[];
    },
    enabled: !!user?.id,
  });

  // Upload attachments to storage
  const uploadAttachments = async (): Promise<string[]> => {
    if (attachments.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    
    for (const file of attachments) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, file);
      
      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload ${file.name}`);
      }
      
      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);
      
      uploadedUrls.push(urlData.publicUrl);
    }
    
    return uploadedUrls;
  };

  // Submit ticket mutation
  const submitTicket = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Please login to submit a ticket");
      
      setIsUploading(true);
      
      // Upload attachments first
      let attachmentUrls: string[] = [];
      try {
        attachmentUrls = await uploadAttachments();
      } catch (error) {
        throw error;
      }
      
      const { error } = await supabase.from("support_tickets").insert([{
        user_id: user.id,
        category,
        subject,
        message,
        priority,
        attachments: attachmentUrls,
        ticket_number: "TKT-TEMP", // Will be overwritten by trigger
      }]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Ticket submitted successfully! We'll get back to you soon.");
      setCategory("");
      setSubject("");
      setMessage("");
      setPriority("normal");
      setAttachments([]);
      setIsUploading(false);
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast.error(error.message || "Failed to submit ticket");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    submitTicket.mutate();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="default" className="bg-blue-500">Open</Badge>;
      case "in_progress":
        return <Badge variant="default" className="bg-yellow-500">In Progress</Badge>;
      case "resolved":
        return <Badge variant="default" className="bg-green-500">Resolved</Badge>;
      case "closed":
        return <Badge variant="secondary">Closed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Contact Support</h1>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto p-4 pb-24 space-y-6">
        {/* Quick Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Need Immediate Help?</CardTitle>
            <CardDescription>
              Contact us directly for urgent issues
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <a href="https://wa.me/919229506624?text=Hello!%20I%20need%20help%20with%20Grumming." target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                WhatsApp Support
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="tel:+919229506624">
                <Phone className="h-4 w-4 mr-2" />
                Call Us
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href="mailto:support@grumming.app">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </a>
            </Button>
          </CardContent>
        </Card>

        {user ? (
          <Tabs defaultValue="new" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">New Ticket</TabsTrigger>
              <TabsTrigger value="history">
                My Tickets {tickets && tickets.length > 0 && `(${tickets.length})`}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Submit a Support Ticket</CardTitle>
                  <CardDescription>
                    Describe your issue and we'll respond within 24 hours
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category *</Label>
                        <Select value={category} onValueChange={setCategory}>
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="priority">Priority</Label>
                        <Select value={priority} onValueChange={setPriority}>
                          <SelectTrigger id="priority">
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {priorities.map((p) => (
                              <SelectItem key={p.value} value={p.value}>
                                <div className="flex flex-col">
                                  <span>{p.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject *</Label>
                      <Input
                        id="subject"
                        placeholder="Brief description of your issue"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        maxLength={150}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Please provide details about your issue..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={5}
                        maxLength={2000}
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {message.length}/2000
                      </p>
                    </div>

                    {/* Attachments Section */}
                    <div className="space-y-2">
                      <Label>Attachments (optional)</Label>
                      <DragDropAttachments
                        attachments={attachments}
                        onAttachmentsChange={setAttachments}
                        maxFiles={5}
                        maxSize={5 * 1024 * 1024}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={submitTicket.isPending || isUploading}
                    >
                      {submitTicket.isPending || isUploading ? (
                        isUploading ? "Uploading..." : "Submitting..."
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Ticket
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="space-y-4">
              {ticketsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : tickets && tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <Card key={ticket.id} className="overflow-hidden">
                      {/* Status Tracker */}
                      <div className="border-b bg-muted/30">
                        <TicketStatusTracker
                          status={ticket.status}
                          createdAt={ticket.created_at}
                          respondedAt={ticket.responded_at}
                          resolvedAt={ticket.resolved_at}
                        />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(ticket.status)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-sm truncate">
                                  {ticket.subject}
                                </p>
                                {getStatusBadge(ticket.status)}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {ticket.ticket_number} • {format(new Date(ticket.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {ticket.message}
                              </p>

                              {/* Attachments display */}
                              {ticket.attachments && ticket.attachments.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {ticket.attachments.map((url, idx) => (
                                    <a
                                      key={idx}
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <FileImage className="h-3 w-3" />
                                      Attachment {idx + 1}
                                    </a>
                                  ))}
                                </div>
                              )}
                              
                              {ticket.admin_response && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  <p className="text-xs font-medium text-primary mb-1">
                                    Support Response:
                                  </p>
                                  <p className="text-sm">{ticket.admin_response}</p>
                                  {ticket.responded_at && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {format(new Date(ticket.responded_at), "MMM d, yyyy 'at' h:mm a")}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {categories.find(c => c.value === ticket.category)?.label || ticket.category}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-semibold mb-2">No tickets yet</h3>
                    <p className="text-muted-foreground text-sm">
                      Submit a ticket and we'll help you out!
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Login to Submit Tickets</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Create an account or login to track your support requests
              </p>
              <Button onClick={() => navigate("/auth")}>
                Login / Sign Up
              </Button>
            </CardContent>
          </Card>
        )}

        {/* FAQ Section */}
        <FAQSection />

        {/* Refund Policy Link */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Have questions about refunds?</h3>
                <p className="text-sm text-muted-foreground">
                  Check our detailed refund policy
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate("/refund-policy")}>
                View Policy
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Chat Widget */}
      <LiveChatWidget />
    </div>
  );
};

export default ContactSupport;
