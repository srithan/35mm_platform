"use client";

import { useState } from "react";
import { Dialog } from "@/components/Dialog/Dialog";
import { Button } from "@/components/Button/Button";
import { 
  Check, 
  Link as LinkIcon, 
  Send, 
  MessageCircle, 
  Mail, 
  MessageSquare, 
  Facebook, 
  Linkedin 
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { motion, AnimatePresence } from "framer-motion";

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  previewContent?: {
    type: "post" | "film" | "user";
    title?: string;
    image?: string;
    description?: string;
  };
}

export function ShareModal({ open, onClose, url, title, previewContent }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOptions = [
    {
      name: "X",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || "Check this out on 35mm")}`,
      color: "bg-black",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(0,0,0,0.5)]",
    },
    {
      name: "Threads",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current" strokeWidth="1.5">
          <path d="M12 12c.333-1 1.333-2 3.5-2 2.5 0 3.5 1.5 3.5 4s-1 4-3.5 4-3.5-1.5-3.5-4c0-2.5 1.5-4 4-4 3 0 5 2.5 5 6s-2.5 7-6 7-7-3.5-7-8 3.5-9 8-9 8 3 8 7" />
        </svg>
      ),
      href: `https://www.threads.net/intent/post?text=${encodeURIComponent((title ? title + " " : "") + url)}`,
      color: "bg-zinc-900 border border-white/10",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(24,24,27,0.5)]",
    },
    {
      name: "Reddit",
      icon: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current">
          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.965 0 1.75.786 1.75 1.75 0 .658-.351 1.23-.888 1.537a1.71 1.71 0 0 1 .044.385c0 2.361-2.667 4.274-5.95 4.274-3.283 0-5.95-1.913-5.95-4.274 0-.131.011-.26.033-.385a1.734 1.734 0 0 1-.866-1.537c0-.964.785-1.75 1.75-1.75.478 0 .901.182 1.209.491 1.192-.853 2.843-1.419 4.67-1.489l.88-4.113a.125.125 0 0 1 .155-.094l2.812.61a1.25 1.25 0 0 1 .127-.052z" />
        </svg>
      ),
      href: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || "Check this out on 35mm")}`,
      color: "bg-[#FF4500]",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(255,69,0,0.5)]",
    },
    {
      name: "Bluesky",
      icon: (
        <svg viewBox="0 0 566.13 510.45" className="w-5 h-5 fill-current">
          <path d="m384.45 61.21c-30.84 57.85-61.69 105.74-61.69 153.64 0 57.85 41.12 71.99 41.12 121.1 0 30.84-20.56 51.41-51.41 51.41-51.41 0-71.99-105.74-121.1-105.74-49.12 0-69.7 105.74-121.1 105.74-30.84 0-51.41-20.56-51.41-51.41 0-49.12 41.12-63.25 41.12-121.1 0-47.9-30.84-95.79-61.69-153.64-10.28-20.56-20.56-41.12-20.56-61.69 0-41.12 25.7-71.99 71.99-71.99 61.69 0 113.11 92.54 133.56 123.11l10.28 15.42 10.28-15.42c20.45-30.57 71.87-123.11 133.56-123.11 46.28 0 71.99 30.84 71.99 71.99 0 20.57-10.28 41.12-20.56 61.69z" />
        </svg>
      ),
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent((title ? title + " " : "") + url)}`,
      color: "bg-[#0085FF]",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(0,133,255,0.5)]",
    },
    {
      name: "Telegram",
      icon: <Send className="w-5 h-5" />,
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title || "")}`,
      color: "bg-[#0088cc]",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(0,136,204,0.5)]",
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle className="w-5 h-5" />,
      href: `https://wa.me/?text=${encodeURIComponent((title ? title + " " : "") + url)}`,
      color: "bg-[#25D366]",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(37,211,102,0.5)]",
    },
    {
      name: "Facebook",
      icon: <Facebook className="w-5 h-5 fill-current" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      color: "bg-[#1877F2]",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(24,119,242,0.5)]",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin className="w-5 h-5" />,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      color: "bg-[#0077B5]",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(0,119,181,0.5)]",
    },
    {
      name: "Email",
      icon: <Mail className="w-5 h-5" />,
      href: `mailto:?subject=${encodeURIComponent(title || "Check this out on 35mm")}&body=${encodeURIComponent(url)}`,
      color: "bg-zinc-500",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(113,113,122,0.5)]",
    },
    {
      name: "Message",
      icon: <MessageSquare className="w-5 h-5" />,
      href: `sms:?&body=${encodeURIComponent((title ? title + " " : "") + url)}`,
      color: "bg-green-600",
      hoverColor: "hover:shadow-[0_0_20px_-5px_rgba(22,163,74,0.5)]",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8, y: 10 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      title="Share" 
      className="max-w-[440px] !bg-bg/95 backdrop-blur-2xl border-white/5"
      contentClassName="pt-2 px-6 pb-6"
    >
      <div className="space-y-6">
        {/* Preview Section - Upgraded */}
        {previewContent && (
          <div className="group relative overflow-hidden rounded-2xl border border-border bg-sunken-2/50 p-4 transition-all duration-300 hover:border-border-strong">
            <div className="flex items-start gap-4">
              {previewContent.image ? (
                <div className="relative h-14 w-14 overflow-hidden rounded-xl shadow-md">
                  <Image 
                    src={previewContent.image} 
                    alt="" 
                    width={56}
                    height={56}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5" />
                </div>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-hover shadow-inner">
                  <LinkIcon className="h-6 w-6 text-fg-muted/40" />
                </div>
              )}
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="inline-block px-1.5 py-0.5 rounded-md bg-hover text-[9px] font-bold text-fg-muted uppercase tracking-wider">
                    {previewContent.type}
                  </span>
                  <div className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[11px] text-fg-muted/60">35mm.in</span>
                </div>
                <h3 className="line-clamp-1 text-[14px] font-bold text-fg tracking-tight">
                  {previewContent.title || "Shared link"}
                </h3>
                <p className="line-clamp-1 text-[12px] text-fg-muted/70">
                  {previewContent.description || url.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Social Grid - Staggered */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-5 gap-y-5 gap-x-2"
        >
          {shareOptions.map((option) => (
            <motion.a
              key={option.name}
              variants={itemVariants}
              href={option.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 group outline-none"
            >
              <div
                className={cn(
                  "relative flex h-14 w-14 items-center justify-center rounded-[18px] transition-all duration-300 group-hover:-translate-y-1 active:scale-95 group-focus-visible:ring-2 ring-accent/30",
                  option.color,
                  option.hoverColor,
                  "text-white shadow-lg shadow-black/10"
                )}
              >
                {/* Inner shine */}
                <div className="absolute inset-0 rounded-[18px] bg-gradient-to-b from-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative z-10 transition-transform duration-300 group-hover:scale-105">
                  {option.icon}
                </div>
              </div>
              <span className="text-[10px] font-bold text-fg-muted/60 tracking-[0.02em] uppercase transition-colors group-hover:text-fg">
                {option.name}
              </span>
            </motion.a>
          ))}
        </motion.div>

        {/* OR Separator */}
        <div className="relative py-2 flex items-center gap-4">
          <div className="h-px flex-1 bg-border/60" />
          <span className="text-[10px] font-bold text-fg-muted/40 uppercase tracking-[0.2em] select-none">
            OR
          </span>
          <div className="h-px flex-1 bg-border/60" />
        </div>

        {/* Copy Section - Refined for "35mm" design language */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 rounded-full border border-border bg-sunken-2 dark:bg-elevated p-1 pl-4 transition-all duration-300 focus-within:border-fg-muted focus-within:shadow-sm">
            <LinkIcon className="h-4 w-4 text-fg-muted flex-shrink-0" />
            <input
              readOnly
              value={url}
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-[13px] text-fg-muted/80 select-all"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant={copied ? "secondary" : "primary"}
              size="sm"
              onClick={handleCopy}
              className={cn(
                "h-8 px-4 rounded-full font-bold text-[11px] tracking-tight transition-all duration-300 min-w-[80px]",
                copied && "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/30"
              )}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.div
                    key="copied"
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                    <span>COPIED</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="copy"
                    initial={{ y: 8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -8, opacity: 0 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="flex items-center gap-1.5"
                  >
                    <span>COPY</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
