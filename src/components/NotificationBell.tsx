import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../services/api";
import { useLanguage } from "../i18n";

interface NotificationItem { id: string; title: string; message: string; link: string | null; readAt: string | null; createdAt: string }
interface NotificationResponse { items: NotificationItem[]; unreadCount: number }

export function NotificationBell() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const query = useQuery<NotificationResponse>({ queryKey: ["notifications"], queryFn: () => notificationService.get<NotificationResponse>(), refetchInterval: 30000 });
  const markRead = useMutation({ mutationFn: () => notificationService.markRead(), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }) });
  return <div className="relative">
    <button type="button" aria-label={`${t("Notifications")}${query.data?.unreadCount ? `, ${query.data.unreadCount} ${t("unread")}` : ""}`} onClick={() => { setOpen(!open); if (!open && query.data?.unreadCount) markRead.mutate(); }} className="relative grid size-10 place-items-center rounded-xl border border-line bg-white text-ink hover:bg-cream"><Bell size={18} />{Boolean(query.data?.unreadCount) && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#e77842] px-1 text-[10px] font-bold text-white">{query.data!.unreadCount > 9 ? "9+" : query.data!.unreadCount}</span>}</button>
    {open && <><button aria-label={t("Close notifications")} className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} /><section className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-float"><header className="flex items-center justify-between border-b border-line px-4 py-3"><div><p className="text-sm font-bold">{t("Notifications")}</p><p className="text-xs text-muted">{t("Updates about payments and account access")}</p></div><button title={t("Mark all as read")} onClick={() => markRead.mutate()} className="rounded-lg p-2 text-muted hover:bg-cream"><CheckCheck size={16} /></button></header><div className="max-h-96 overflow-y-auto">{query.data?.items.length ? query.data.items.map((item) => { const content = <article className={`border-b border-line/70 px-4 py-3 ${item.readAt ? "" : "bg-[#f2f8f3]"}`}><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs leading-relaxed text-muted">{item.message}</p><time className="mt-2 block text-[10px] text-muted">{new Date(item.createdAt).toLocaleString()}</time></article>; return item.link ? <Link key={item.id} to={item.link} onClick={() => setOpen(false)}>{content}</Link> : <div key={item.id}>{content}</div>; }) : <p className="p-8 text-center text-sm text-muted">{t("You’re all caught up.")}</p>}</div></section></>}
  </div>;
}
