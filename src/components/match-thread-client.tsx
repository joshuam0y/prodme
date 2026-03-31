"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type Message = {
  id: number | string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  pending?: boolean;
};

type Props = {
  matchId: string;
  currentUserId: string;
  matchName: string;
  initialMessages: Message[];
  initialDraft?: string | null;
};

function isConversationMessage(m: Message, me: string, them: string): boolean {
  return (
    (m.sender_id === me && m.recipient_id === them) ||
    (m.sender_id === them && m.recipient_id === me)
  );
}

export function MatchThreadClient({
  matchId,
  currentUserId,
  matchName,
  initialMessages,
  initialDraft = null,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [body, setBody] = useState(initialDraft ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchTyping, setMatchTyping] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [moderationNotice, setModerationNotice] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [blockedByMe, setBlockedByMe] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | "report" | "block" | "unblock">(null);
  const blocked = Boolean(moderationNotice?.toLowerCase().includes("blocked"));
  const listRef = useRef<HTMLUListElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const typingStateRef = useRef(false);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isRefreshingRef = useRef(false);

  const mergeMessages = useCallback((incoming: Message[]) => {
    setMessages((prev) => {
      const byId = new Map<string, Message>();
      for (const m of prev) byId.set(String(m.id), m);
      for (const m of incoming) {
        const key = String(m.id);
        const existing = byId.get(key);
        byId.set(key, existing ? { ...existing, ...m, pending: false } : m);
      }
      return Array.from(byId.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    });
  }, []);

  const refreshMessages = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, { method: "GET" });
      const json = (await res.json()) as {
        ok: boolean;
        messages?: Message[];
        error?: string;
      };
      if (res.ok && json.ok && Array.isArray(json.messages)) {
        mergeMessages(json.messages);
        setLastSyncedAt(new Date().toISOString());
        setModerationNotice(null);
      } else if (json.error === "blocked") {
        try {
          const blockRes = await fetch(`/api/matches/${matchId}/block`, {
            method: "GET",
          });
          const blockJson = (await blockRes.json()) as {
            ok: boolean;
            blockedByMe?: boolean;
            blockedByThem?: boolean;
          };
          if (blockRes.ok && blockJson.ok) {
            const byMe = Boolean(blockJson.blockedByMe);
            const byThem = Boolean(blockJson.blockedByThem);
            setBlockedByMe(byMe);
            setModerationNotice(
              byMe
                ? "Messaging is unavailable because you blocked this profile."
                : byThem
                  ? "Messaging is unavailable because this profile blocked you."
                  : "Messaging is unavailable because one of you has blocked the other.",
            );
          } else {
            setModerationNotice("Messaging is unavailable because one of you has blocked the other.");
          }
        } catch {
          setModerationNotice("Messaging is unavailable because one of you has blocked the other.");
        }
      } else {
        setModerationNotice(null);
      }
    } catch {
      // Non-blocking fallback.
    } finally {
      isRefreshingRef.current = false;
      setIsSyncing(false);
    }
  }, [matchId, mergeMessages]);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const markRead = useCallback(async () => {
    try {
      await fetch(`/api/matches/${matchId}/read`, { method: "POST" });
    } catch {
      // Non-blocking.
    }
  }, [matchId]);

  useEffect(() => {
    const convoKey =
      currentUserId < matchId
        ? `${currentUserId}:${matchId}`
        : `${matchId}:${currentUserId}`;

    const ch = supabase
      .channel(`match:${convoKey}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `recipient_id=eq.${currentUserId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          if (!isConversationMessage(next, currentUserId, matchId)) return;
          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(next.id))) return prev;
            return [...prev, next];
          });
          void markRead();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_messages",
          filter: `sender_id=eq.${currentUserId}`,
        },
        (payload) => {
          const next = payload.new as Message;
          if (!isConversationMessage(next, currentUserId, matchId)) return;
          setMessages((prev) => {
            if (prev.some((m) => String(m.id) === String(next.id))) return prev;
            return [...prev, next];
          });
        },
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const p = payload as { userId?: string; isTyping?: boolean };
        if (!p || p.userId !== matchId) return;
        setMatchTyping(Boolean(p.isTyping));
      });

    channelRef.current = ch;
    ch.subscribe();
    return () => {
      void ch.unsubscribe();
    };
  }, [currentUserId, markRead, matchId, supabase]);

  useEffect(() => {
    const loadBlockState = async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}/block`, { method: "GET" });
        const json = (await res.json()) as {
          ok: boolean;
          blockedByMe?: boolean;
          blockedByThem?: boolean;
        };
        if (res.ok && json.ok) {
          const byMe = Boolean(json.blockedByMe);
          const byThem = Boolean(json.blockedByThem);
          setBlockedByMe(byMe);
          if (byMe || byThem) {
            setModerationNotice(
              byMe
                ? "Messaging is unavailable because you blocked this profile."
                : "Messaging is unavailable because this profile blocked you.",
            );
          } else {
            setModerationNotice(null);
          }
        }
      } catch {
        // Non-blocking.
      }
    };
    void loadBlockState();
    void refreshMessages();
    const interval = window.setInterval(() => {
      void refreshMessages();
    }, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshMessages();
    };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [matchId, refreshMessages]);

  useEffect(() => {
    if (!initialDraft) return;
    window.setTimeout(() => textareaRef.current?.focus(), 50);
  }, [initialDraft]);

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (typingStateRef.current === isTyping) return;
      typingStateRef.current = isTyping;
      const ch = channelRef.current;
      if (!ch) return;
      void ch.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: currentUserId, isTyping },
      });
    },
    [currentUserId],
  );

  const onChangeBody = (next: string) => {
    setBody(next);
    setError(null);
    sendTyping(next.trim().length > 0);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      sendTyping(false);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
      sendTyping(false);
    };
  }, [sendTyping]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    void sendMessage();
  };

  const sendMessage = useCallback(async () => {
    const text = body.trim();
    if (!text || sending || blocked) return;

    setSending(true);
    setError(null);
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      sender_id: currentUserId,
      recipient_id: matchId,
      body: text,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setBody("");
    sendTyping(false);

    try {
      const res = await fetch(`/api/matches/${matchId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: text }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        error?: string;
        message?: Message;
      };
      if (!res.ok || !json.ok || !json.message) {
        setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
        setError(
          json.error === "blocked"
            ? "Messaging is unavailable because this profile is blocked."
            : json.error === "not_matched"
            ? "You can only message mutual matches."
            : "Could not send message.",
        );
        return;
      }
      setMessages((prev) =>
        prev.map((m) => (String(m.id) === tempId ? json.message! : m)),
      );
      void refreshMessages();
    } catch {
      setMessages((prev) => prev.filter((m) => String(m.id) !== tempId));
      setError("Could not send message.");
    } finally {
      setSending(false);
    }
  }, [body, blocked, currentUserId, matchId, refreshMessages, sendTyping, sending]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setConfirmAction(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      {isSyncing ? (
        <div className="mb-2 flex items-center gap-2 px-1 text-[11px] text-zinc-500">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
            Syncing…
          </span>
          {lastSyncedAt ? (
            <span className="text-zinc-400">
              Updated {new Date(lastSyncedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-zinc-950/50">
        <ul
          ref={listRef}
          className="flex max-h-[min(52vh,420px)] flex-col gap-1 overflow-y-auto p-3 sm:max-h-[min(56vh,480px)]"
        >
          {messages.length === 0 ? (
            <li className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
              <p className="text-sm font-medium text-zinc-400">Say hello first</p>
              <p className="mt-1 text-xs text-zinc-600">
                Matches work best with a short, friendly opener.
              </p>
            </li>
          ) : (
            messages.map((m, i) => {
              const mine = m.sender_id === currentUserId;
              const next = messages[i + 1];
              const showSeen =
                mine && (!next || next.sender_id !== currentUserId) && m.read_at !== null;
              return (
                <li key={String(m.id)} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                      mine
                        ? "rounded-br-md bg-gradient-to-br from-amber-500/25 to-amber-600/15 text-amber-50 ring-1 ring-amber-500/30"
                        : "rounded-bl-md bg-white/[0.06] text-zinc-100 ring-1 ring-white/10"
                    } ${m.pending ? "opacity-70" : ""}`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    {showSeen ? (
                      <p className="mt-1 text-right text-[10px] font-medium text-emerald-400/80">
                        Seen
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })
          )}
          {matchTyping ? (
            <li className="pl-2 text-xs text-zinc-500">{matchName} is typing...</li>
          ) : null}
        </ul>
      </div>

      {error ? (
        <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}
      {moderationNotice ? (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          {moderationNotice}
        </p>
      ) : null}
      <div className="mt-3 flex items-center justify-end">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirmAction(null);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            aria-label="Conversation options"
            aria-expanded={menuOpen}
          >
            ⋯
          </button>
          {menuOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-2xl backdrop-blur">
              {confirmAction ? (
                <div className="space-y-2 p-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    {confirmAction === "report"
                      ? "Report conversation?"
                      : confirmAction === "block"
                        ? "Block profile?"
                        : "Unblock profile?"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {confirmAction === "report"
                      ? "We’ll review this chat. Use this for spam or abuse."
                      : confirmAction === "block"
                        ? "You won’t see or message each other."
                        : "Messaging will be re-enabled if they haven’t blocked you."}
                  </p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setConfirmAction(null)}
                      className="flex-1 rounded-full border border-white/15 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={
                        confirmAction === "report"
                          ? reporting || messages.length === 0
                          : blocking
                      }
                      onClick={async () => {
                        if (confirmAction === "report") {
                          if (reporting || messages.length === 0) return;
                          const lastIncoming = [...messages]
                            .reverse()
                            .find((m) => m.sender_id === matchId && !m.pending);
                          setReporting(true);
                          try {
                            const res = await fetch(`/api/matches/${matchId}/report`, {
                              method: "POST",
                              headers: { "content-type": "application/json" },
                              body: JSON.stringify({
                                reason: "abusive_or_spam",
                                messageId:
                                  lastIncoming && typeof lastIncoming.id === "number"
                                    ? lastIncoming.id
                                    : undefined,
                              }),
                            });
                            if (res.ok) {
                              setModerationNotice("Report submitted. We will review this conversation.");
                              setMenuOpen(false);
                              setConfirmAction(null);
                            }
                          } finally {
                            setReporting(false);
                          }
                          return;
                        }

                        setBlocking(true);
                        try {
                          const res = await fetch(`/api/matches/${matchId}/block`, confirmAction === "unblock"
                            ? { method: "DELETE" }
                            : {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ reason: "user_requested_block" }),
                              });
                          if (res.ok) {
                            if (confirmAction === "unblock") {
                              setBlockedByMe(false);
                              setModerationNotice(null);
                              setError(null);
                              void refreshMessages();
                            } else {
                              setBlockedByMe(true);
                              setModerationNotice("Messaging is unavailable because one of you has blocked the other.");
                              setError("You blocked this profile.");
                            }
                            setMenuOpen(false);
                            setConfirmAction(null);
                          }
                        } finally {
                          setBlocking(false);
                        }
                      }}
                      className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-50 ${
                        confirmAction === "report"
                          ? "bg-amber-500 text-zinc-950 hover:bg-amber-400"
                          : confirmAction === "unblock"
                            ? "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/35 hover:bg-emerald-500/30"
                            : "bg-red-500/15 text-red-200 ring-1 ring-red-500/35 hover:bg-red-500/20"
                      }`}
                    >
                      {confirmAction === "report"
                        ? reporting
                          ? "Reporting…"
                          : "Report"
                        : confirmAction === "unblock"
                          ? blocking
                            ? "Unblocking…"
                            : "Unblock"
                          : blocking
                            ? "Blocking…"
                            : "Block"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <button
                    type="button"
                    disabled={messages.length === 0}
                    onClick={() => setConfirmAction("report")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-zinc-200 hover:bg-white/5 disabled:opacity-40"
                  >
                    <span>Report</span>
                    <span className="text-xs text-zinc-500">Spam/abuse</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(blockedByMe ? "unblock" : "block")}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5 ${
                      blockedByMe ? "text-emerald-200" : "text-red-200"
                    }`}
                  >
                    <span>{blockedByMe ? "Unblock" : "Block"}</span>
                    <span className="text-xs text-zinc-500">
                      {blockedByMe ? "Re-enable chat" : "Stop seeing them"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
      <form
        ref={formRef}
        className="mt-3 rounded-2xl border border-white/10 bg-zinc-900/60 p-2 shadow-inner shadow-black/20"
        onSubmit={onSubmit}
      >
        <label htmlFor="chat-body" className="sr-only">
          Message {matchName}
        </label>
        <textarea
          id="chat-body"
          name="body"
          rows={2}
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          ref={textareaRef}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            if (e.shiftKey) return;
            e.preventDefault();
            void sendMessage();
          }}
          onBlur={() => sendTyping(false)}
          className="w-full resize-none rounded-xl border-0 bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0"
          placeholder={`Message ${matchName}...`}
        />
        <div className="flex justify-end border-t border-white/5 px-2 pb-1 pt-2">
          <button
            type="submit"
            disabled={sending || blocked}
            className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-amber-400 disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </>
  );
}
