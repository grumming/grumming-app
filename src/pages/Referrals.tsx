import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Copy, Share2, Gift, Users, Check, Sparkles, MessageCircle, Trophy, Crown, Medal, Clock, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useReferral } from '@/hooks/useReferral';

const Referrals = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { referralCode, referrals, userReward, leaderboard, isLoading, isLoadingLeaderboard, getShareUrl, getShareText } = useReferral();
  const [copied, setCopied] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Gift className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="font-display text-xl font-bold mb-2">Login to Access Referrals</h2>
            <p className="text-muted-foreground mb-4">
              Sign in to get your referral code and earn rewards!
            </p>
            <Button onClick={() => navigate('/auth')}>Login / Sign Up</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCopyCode = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({ title: 'Code copied!', description: 'Share it with your friends' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Join Grumming',
      text: getShareText(),
      url: getShareUrl(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${getShareText()} ${getShareUrl()}`);
        toast({ title: 'Link copied!', description: 'Share it with your friends' });
      }
    } catch (error) {
      // User cancelled share
    }
  };

  const handleWhatsAppShare = () => {
    const message = encodeURIComponent(`${getShareText()}\n\n${getShareUrl()}`);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const successfulReferrals = referrals?.filter(r => r.status === 'completed').length || 0;
  const pendingReferrals = referrals?.filter(r => r.status === 'pending').length || 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-50 glass">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-xl font-bold">Refer & Earn</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="overflow-hidden bg-gradient-to-br from-primary/10 via-accent/10 to-background border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                  <Gift className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-2xl font-bold">Invite Friends</h2>
                  <p className="text-muted-foreground">Both get ₹100 off!</p>
                </div>
              </div>

              <div className="bg-card rounded-xl p-4 mb-4">
                <p className="text-sm text-muted-foreground mb-2">Your referral code</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-bold tracking-wider text-primary flex-1">
                    {isLoading ? '...' : referralCode || 'N/A'}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyCode}
                    className="shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleWhatsAppShare} 
                  className="flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white" 
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp
                </Button>
                <Button onClick={handleShare} variant="outline" className="flex-1" size="lg">
                  <Share2 className="w-5 h-5 mr-2" />
                  Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <CheckCircle2 className="w-7 h-7 mx-auto text-green-500 mb-2" />
                <p className="text-2xl font-bold">{successfulReferrals}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <Clock className="w-7 h-7 mx-auto text-amber-500 mb-2" />
                <p className="text-2xl font-bold">{pendingReferrals}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardContent className="p-4 text-center">
                <Sparkles className="w-7 h-7 mx-auto text-primary mb-2" />
                <p className="text-2xl font-bold">₹{userReward?.available || 0}</p>
                <p className="text-xs text-muted-foreground">Earned</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Leaderboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h3 className="font-display text-lg font-semibold">Top Referrers</h3>
              </div>
              
              {isLoadingLeaderboard ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-secondary/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((entry) => (
                    <div
                      key={entry.userId}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        entry.isCurrentUser 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'bg-secondary/50'
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        {entry.rank === 1 ? (
                          <Crown className="w-6 h-6 text-yellow-500" />
                        ) : entry.rank === 2 ? (
                          <Medal className="w-6 h-6 text-gray-400" />
                        ) : entry.rank === 3 ? (
                          <Medal className="w-6 h-6 text-amber-600" />
                        ) : (
                          <span className="text-lg font-bold text-muted-foreground">
                            {entry.rank}
                          </span>
                        )}
                      </div>
                      
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                        {entry.avatarUrl ? (
                          <img 
                            src={entry.avatarUrl} 
                            alt={entry.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Users className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      
                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.isCurrentUser ? 'You' : entry.name}
                        </p>
                        {entry.isCurrentUser && (
                          <p className="text-xs text-primary">Your rank</p>
                        )}
                      </div>
                      
                      {/* Count */}
                      <Badge 
                        variant={entry.rank <= 3 ? 'default' : 'secondary'}
                        className={entry.rank === 1 ? 'bg-yellow-500' : ''}
                      >
                        {entry.referralCount} {entry.referralCount === 1 ? 'referral' : 'referrals'}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Be the first to refer friends!</p>
                  <p className="text-sm mt-1">Share your code to climb the leaderboard</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* How it works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <h3 className="font-display text-lg font-semibold mb-4">How it works</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Share your code', desc: 'Send your unique code to friends' },
                  { step: 2, title: 'Friend signs up', desc: 'They register using your referral code' },
                  { step: 3, title: 'Both get rewarded!', desc: 'You both receive ₹100 off your next booking' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Referral History */}
        {referrals && referrals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card>
              <CardContent className="p-6">
                <h3 className="font-display text-lg font-semibold mb-4">Your Referrals</h3>
                <div className="space-y-3">
                  {referrals.map((referral) => (
                    <div
                      key={referral.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                        referral.status === 'completed' 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-amber-500/5 border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          referral.status === 'completed' 
                            ? 'bg-green-500/10' 
                            : 'bg-amber-500/10'
                        }`}>
                          {referral.status === 'completed' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">
                            {referral.status === 'completed' ? 'Booking Completed' : 'Awaiting First Booking'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Joined {new Date(referral.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={referral.status === 'completed' ? 'default' : 'secondary'}
                        className={referral.status === 'completed' 
                          ? 'bg-green-500 hover:bg-green-500/90' 
                          : 'bg-amber-500/20 text-amber-600 hover:bg-amber-500/30'}
                      >
                        {referral.status === 'completed' ? '+₹100' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Referrals;
