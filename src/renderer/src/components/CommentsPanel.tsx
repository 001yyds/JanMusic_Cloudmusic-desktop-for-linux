import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Heart,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  X
} from 'lucide-react'
import type { Comment, CommentSort, CommentUser, Song } from '../../../shared/types'
import { api, coverUrl, songArtists, songCover } from '../lib/api'
import { cn } from '../lib/cn'
import { formatCount, relativeTime } from '../lib/format'
import { useAuthStore } from '../store/auth'
import { useUiStore } from '../store/ui'
import { Cover } from './Cover'

type SortKey = 'recommend' | 'hot' | 'new'

const SORT_TYPE: Record<SortKey, CommentSort> = { recommend: 99, hot: 2, new: 3 }
const SORT_LABEL: Record<SortKey, string> = { recommend: '推荐', hot: '最热', new: '最新' }
const PAGE_SIZE = 20

interface FloorState {
  comments: Comment[]
  total: number
  loading: boolean
}

function CommentAvatar({ user, size = 32 }: { user?: CommentUser; size?: number }): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const src = user?.avatarUrl ? coverUrl(user.avatarUrl, 100) : ''
  if (!src || failed) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand"
        style={{ width: size, height: size }}
      >
        {user?.nickname?.slice(0, 1) ?? '?'}
      </span>
    )
  }
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-full object-cover ring-1 ring-white/50"
      style={{ width: size, height: size }}
    />
  )
}

function CommentRow({
  comment,
  floor,
  expanded,
  currentUserId,
  depth = 0,
  onLike,
  onReply,
  onDelete,
  onExpand
}: {
  comment: Comment
  floor?: FloorState
  expanded: boolean
  currentUserId?: number
  depth?: number
  onLike: (comment: Comment) => void
  onReply: (comment: Comment) => void
  onDelete: (comment: Comment) => void
  onExpand: (comment: Comment) => void
}): React.JSX.Element {
  const replyCount = comment.showFloorComment?.replyCount ?? comment.replyCount ?? 0
  const owner = comment.owner || (!!currentUserId && comment.user?.userId === currentUserId)
  const ip = comment.ipLocation?.location

  return (
    <div className={cn('flex gap-2.5', depth ? 'px-3 py-2.5' : 'px-4 py-3')}>
      <CommentAvatar user={comment.user} size={depth ? 26 : 32} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-[11.5px] text-black/55">{comment.user?.nickname ?? '网易云用户'}</span>
          {comment.user?.vipType ? (
            <span className="rounded-[3px] border border-brand/30 px-1 text-[8px] leading-[12px] text-brand/80">
              VIP
            </span>
          ) : null}
          {owner && (
            <span className="rounded-[3px] bg-white/40 px-1 text-[8px] leading-[12px] text-black/45">我</span>
          )}
        </div>

        <div className="mt-1 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-black/80">
          {comment.content}
        </div>

        {comment.beReplied?.map((reply, index) =>
          reply.content ? (
            <div
              key={`${comment.commentId}-reply-${index}`}
              className="mt-1.5 rounded-[8px] bg-white/25 px-2 py-1 text-[11.5px] leading-relaxed text-black/45"
            >
              <span className="text-black/55">@{reply.user?.nickname ?? '用户'}：</span>
              {reply.content}
            </div>
          ) : null
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-black/30">
          <span>{relativeTime(comment.time, comment.timeStr)}</span>
          {ip ? <span>{ip}</span> : null}
          <button
            onClick={() => onReply(comment)}
            className="transition-colors duration-200 hover:text-black/65"
          >
            回复
          </button>
          {owner && (
            <button
              onClick={() => onDelete(comment)}
              className="flex items-center gap-0.5 transition-colors duration-200 hover:text-brand"
            >
              <Trash2 size={10} />
              删除
            </button>
          )}
          <button
            onClick={() => onLike(comment)}
            className={cn(
              'ml-auto flex items-center gap-1 transition-all duration-200 active:scale-90',
              comment.liked ? 'text-brand' : 'hover:text-black/60'
            )}
          >
            <Heart size={11} fill={comment.liked ? 'currentColor' : 'none'} />
            {comment.likedCount ? formatCount(comment.likedCount) : ''}
          </button>
        </div>

        {!depth && replyCount > 0 && (
          <button
            onClick={() => onExpand(comment)}
            className="mt-2 flex items-center gap-1 text-[10.5px] text-brand/70 transition-colors duration-200 hover:text-brand"
          >
            {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            {expanded ? '收起回复' : `共 ${replyCount} 条回复`}
          </button>
        )}

        {!depth && expanded && floor && (
          <div className="mt-2 rounded-[12px] border border-white/35 bg-white/15 py-1">
            {floor.loading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-[10.5px] text-black/30">
                <Loader2 size={12} className="animate-spin" />
                加载回复…
              </div>
            ) : floor.comments.length ? (
              floor.comments.map((item) => (
                <CommentRow
                  key={item.commentId}
                  comment={item}
                  floor={undefined}
                  expanded={false}
                  currentUserId={currentUserId}
                  depth={1}
                  onLike={onLike}
                  onReply={onReply}
                  onDelete={onDelete}
                  onExpand={onExpand}
                />
              ))
            ) : (
              <div className="py-3 text-center text-[10.5px] text-black/25">暂无回复</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CommentSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4 px-4 py-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex gap-3">
          <div className="skeleton h-8 w-8 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-2.5 w-20 rounded" />
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CommentsPanelInner({ song }: { song: Song }): React.JSX.Element {
  const close = useUiStore((state) => state.closeComments)
  const setLoginOpen = useUiStore((state) => state.setLoginOpen)
  const toast = useUiStore((state) => state.toast)
  const loggedIn = useAuthStore((state) => state.loggedIn)
  const profile = useAuthStore((state) => state.profile)

  const [sort, setSort] = useState<SortKey>('recommend')
  const [comments, setComments] = useState<Comment[]>([])
  const [hot, setHot] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [cursor, setCursor] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [floors, setFloors] = useState<Record<number, FloorState>>({})
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const requestId = useRef(0)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const songId = song.id

  const loadFirst = useCallback(
    async (sortKey: SortKey, silent = false): Promise<void> => {
      const request = ++requestId.current
      if (!silent) {
        setLoading(true)
        setError('')
        setComments([])
        setHot([])
        setTotal(0)
        setHasMore(false)
        setPage(1)
        setCursor('')
        setFloors({})
        setExpanded({})
        scrollRef.current?.scrollTo({ top: 0 })
      }
      try {
        if (sortKey === 'recommend') {
          const result = await api.comment.list(songId, 0, PAGE_SIZE)
          if (request !== requestId.current) return
          setComments(result.comments)
          setHot(result.hotComments)
          setTotal(result.total)
          setHasMore(result.hasMore)
          setPage(1)
        } else {
          const result = await api.comment.sorted(songId, SORT_TYPE[sortKey], 1, PAGE_SIZE)
          if (request !== requestId.current) return
          setComments(result.comments)
          setHot([])
          setTotal(result.total)
          setHasMore(result.hasMore)
          setCursor(result.cursor ?? '')
          setPage(1)
        }
      } catch (caught) {
        if (request !== requestId.current) return
        setError(caught instanceof Error ? caught.message : '评论加载失败')
      } finally {
        if (request === requestId.current && !silent) setLoading(false)
      }
    },
    [songId]
  )

  useEffect(() => {
    void loadFirst(sort)
  }, [sort, loadFirst])

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  const loadMore = async (): Promise<void> => {
    if (loadingMore || !hasMore) return
    const request = requestId.current
    setLoadingMore(true)
    try {
      if (sort === 'recommend') {
        const next = page + 1
        const result = await api.comment.list(songId, (next - 1) * PAGE_SIZE, PAGE_SIZE)
        if (request !== requestId.current) return
        setComments((previous) => {
          const seen = new Set(previous.map((comment) => comment.commentId))
          return [...previous, ...result.comments.filter((comment) => !seen.has(comment.commentId))]
        })
        setHasMore(result.hasMore)
        setPage(next)
      } else {
        const next = page + 1
        const result = await api.comment.sorted(songId, SORT_TYPE[sort], next, PAGE_SIZE, cursor)
        if (request !== requestId.current) return
        setComments((previous) => {
          const seen = new Set(previous.map((comment) => comment.commentId))
          return [...previous, ...result.comments.filter((comment) => !seen.has(comment.commentId))]
        })
        setHasMore(result.hasMore)
        setCursor(result.cursor ?? cursor)
        setPage(next)
      }
    } catch (caught) {
      if (request !== requestId.current) return
      toast(caught instanceof Error ? caught.message : '加载更多评论失败', 'error')
    } finally {
      setLoadingMore(false)
    }
  }

  const updateComment = (commentId: number, update: (comment: Comment) => Comment): void => {
    setComments((previous) =>
      previous.map((comment) => (comment.commentId === commentId ? update(comment) : comment))
    )
    setHot((previous) =>
      previous.map((comment) => (comment.commentId === commentId ? update(comment) : comment))
    )
    setFloors((previous) => {
      let changed = false
      const next: Record<number, FloorState> = { ...previous }
      for (const [key, floor] of Object.entries(previous)) {
        if (!floor.comments.some((comment) => comment.commentId === commentId)) continue
        next[Number(key)] = {
          ...floor,
          comments: floor.comments.map((comment) =>
            comment.commentId === commentId ? update(comment) : comment
          )
        }
        changed = true
      }
      return changed ? next : previous
    })
  }

  const toggleLike = async (comment: Comment): Promise<void> => {
    if (!loggedIn) {
      setLoginOpen(true)
      return
    }
    const liked = !comment.liked
    updateComment(comment.commentId, (item) => ({
      ...item,
      liked,
      likedCount: Math.max(0, item.likedCount + (liked ? 1 : -1))
    }))
    try {
      await api.comment.like(songId, comment.commentId, liked)
    } catch (caught) {
      updateComment(comment.commentId, (item) => ({
        ...item,
        liked: !liked,
        likedCount: Math.max(0, item.likedCount + (liked ? -1 : 1))
      }))
      toast(caught instanceof Error ? caught.message : '操作失败', 'error')
    }
  }

  const removeComment = async (comment: Comment): Promise<void> => {
    try {
      await api.comment.remove(songId, comment.commentId)
      setComments((previous) => previous.filter((item) => item.commentId !== comment.commentId))
      setHot((previous) => previous.filter((item) => item.commentId !== comment.commentId))
      setFloors((previous) => {
        const next: Record<number, FloorState> = { ...previous }
        for (const [key, floor] of Object.entries(previous)) {
          next[Number(key)] = {
            ...floor,
            comments: floor.comments.filter((item) => item.commentId !== comment.commentId)
          }
        }
        return next
      })
      setTotal((value) => Math.max(0, value - 1))
      toast('已删除评论', 'success')
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : '删除评论失败', 'error')
    }
  }

  const expandFloor = async (comment: Comment): Promise<void> => {
    if (expanded[comment.commentId]) {
      setExpanded((previous) => ({ ...previous, [comment.commentId]: false }))
      return
    }
    setExpanded((previous) => ({ ...previous, [comment.commentId]: true }))
    if (floors[comment.commentId]?.loading) return
    setFloors((previous) => ({
      ...previous,
      [comment.commentId]: { comments: [], total: 0, loading: true }
    }))
    try {
      const result = await api.comment.floor(songId, comment.commentId, 50)
      setFloors((previous) => ({
        ...previous,
        [comment.commentId]: { comments: result.comments, total: result.total, loading: false }
      }))
    } catch (caught) {
      setFloors((previous) => ({
        ...previous,
        [comment.commentId]: { comments: [], total: 0, loading: false }
      }))
      toast(caught instanceof Error ? caught.message : '回复加载失败', 'error')
    }
  }

  const startReply = (comment: Comment): void => {
    setReplyTo(comment)
    requestAnimationFrame(() => composerRef.current?.focus())
  }

  const submit = async (): Promise<void> => {
    const content = draft.trim()
    if (!content || posting) return
    if (!loggedIn) {
      setLoginOpen(true)
      return
    }
    const target = replyTo
    setPosting(true)
    try {
      await api.comment.add(songId, content, target?.commentId)
      setDraft('')
      setReplyTo(null)
      toast(target ? '回复成功' : '评论成功', 'success')
      await loadFirst(sort, true)
      if (target) {
        setExpanded((previous) => ({ ...previous, [target.commentId]: true }))
        setFloors((previous) => ({ ...previous, [target.commentId]: { comments: [], total: 0, loading: true } }))
        try {
          const result = await api.comment.floor(songId, target.commentId, 50)
          setFloors((previous) => ({
            ...previous,
            [target.commentId]: { comments: result.comments, total: result.total, loading: false }
          }))
        } catch {
          setFloors((previous) => ({
            ...previous,
            [target.commentId]: { comments: [], total: 0, loading: false }
          }))
        }
      }
    } catch (caught) {
      toast(caught instanceof Error ? caught.message : '评论失败', 'error')
    } finally {
      setPosting(false)
    }
  }

  return (
    <motion.div
      key="comments"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex items-center justify-center sm:p-6"
    >
      <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-xl" onClick={close} />

      <motion.div
        initial={{ opacity: 0, y: 26, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 330, damping: 32 }}
        className="glass-strong relative flex h-full w-full flex-col overflow-hidden border-white/45 shadow-[0_40px_120px_-32px_rgba(0,0,0,0.4)] sm:h-[min(88vh,820px)] sm:max-w-[720px] sm:rounded-[28px] sm:border"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-brand/10 blur-[80px]" />

        <header className="mobile-header relative flex shrink-0 items-center gap-3 border-b border-white/30 px-4 pb-3 pt-2 sm:px-5">
          <Cover src={songCover(song, 160)} radius={10} className="h-11 w-11 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-medium text-black/85">{song.name}</div>
            <div className="mt-0.5 truncate text-[10.5px] text-black/40">{songArtists(song)}</div>
          </div>
          <div className="hidden text-right sm:block">
            <div className="tabular text-[12px] text-black/60">{formatCount(total)}</div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-black/30">Comments</div>
          </div>
          <button
            onClick={close}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/35 transition-all duration-200 hover:bg-white/40 hover:text-black active:scale-90"
          >
            <X size={16} />
          </button>
        </header>

        <div className="relative flex shrink-0 items-center gap-5 border-b border-white/25 px-4 sm:px-5">
          {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => {
                if (sort !== key) setSort(key)
              }}
              className={cn(
                'relative py-2.5 text-[12px] transition-colors duration-200',
                sort === key ? 'font-medium text-black' : 'text-black/40 hover:text-black/65'
              )}
            >
              {SORT_LABEL[key]}
              {sort === key && <span className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-brand" />}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-black/30">{formatCount(total)} 条评论</span>
        </div>

        <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <AlertCircle size={28} strokeWidth={1.4} className="text-brand/50" />
              <p className="text-[12px] text-black/40">{error}</p>
              <button
                onClick={() => void loadFirst(sort)}
                className="rounded-full border border-white/45 bg-white/25 px-4 py-1.5 text-[11px] text-black/55 transition-colors duration-200 hover:bg-white/40 hover:text-black"
              >
                重新加载
              </button>
            </div>
          ) : loading ? (
            <CommentSkeleton />
          ) : !comments.length && !hot.length ? (
            <div className="flex flex-col items-center justify-center py-24 text-black/25">
              <MessageSquare size={32} strokeWidth={1.3} />
              <p className="mt-3 text-[12px]">还没有评论，来抢沙发吧</p>
            </div>
          ) : (
            <>
              {sort === 'recommend' && hot.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-[10px] uppercase tracking-[0.2em] text-black/35">
                    <span className="h-3 w-[2px] rounded-full bg-brand/70" />
                    精彩评论
                  </div>
                  {hot.map((comment) => (
                    <CommentRow
                      key={`hot-${comment.commentId}`}
                      comment={comment}
                      floor={floors[comment.commentId]}
                      expanded={!!expanded[comment.commentId]}
                      currentUserId={profile?.userId}
                      onLike={(item) => void toggleLike(item)}
                      onReply={startReply}
                      onDelete={(item) => void removeComment(item)}
                      onExpand={(item) => void expandFloor(item)}
                    />
                  ))}
                  <div className="mx-4 my-1 border-t border-white/30" />
                </>
              )}

              <div className="flex items-center gap-2 px-4 pb-1 pt-3 text-[10px] uppercase tracking-[0.2em] text-black/35">
                <span className="h-3 w-[2px] rounded-full bg-black/15" />
                {sort === 'recommend' ? '最新评论' : `${SORT_LABEL[sort]}评论`}
              </div>

              {comments.map((comment) => (
                <CommentRow
                  key={comment.commentId}
                  comment={comment}
                  floor={floors[comment.commentId]}
                  expanded={!!expanded[comment.commentId]}
                  currentUserId={profile?.userId}
                  onLike={(item) => void toggleLike(item)}
                  onReply={startReply}
                  onDelete={(item) => void removeComment(item)}
                  onExpand={(item) => void expandFloor(item)}
                />
              ))}

              <div className="flex flex-col items-center gap-2 py-4">
                {hasMore ? (
                  <button
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="flex items-center gap-1.5 rounded-full border border-white/40 bg-white/20 px-4 py-1.5 text-[11px] text-black/50 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-95 disabled:opacity-40"
                  >
                    {loadingMore && <Loader2 size={11} className="animate-spin" />}
                    {loadingMore ? '加载中…' : '加载更多评论'}
                  </button>
                ) : (
                  comments.length > 0 && <p className="text-[10px] text-black/25">没有更多评论了</p>
                )}
              </div>
            </>
          )}
        </div>

        <footer className="mobile-bottom relative shrink-0 border-t border-white/30 px-4 pt-2.5 sm:px-5">
          {replyTo && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] text-black/40">
              <CornerDownRight size={11} />
              回复 @{replyTo.user?.nickname ?? '用户'}
              <button
                onClick={() => setReplyTo(null)}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/40"
              >
                <X size={10} />
              </button>
            </div>
          )}

          {loggedIn ? (
            <div className="flex items-end gap-2.5 pb-1">
              <CommentAvatar user={profile ?? undefined} size={30} />
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void submit()
                  }
                }}
                maxLength={140}
                rows={1}
                placeholder={replyTo ? `回复 @${replyTo.user?.nickname ?? '用户'}…` : '写下你的评论…'}
                className="max-h-24 min-h-[38px] flex-1 resize-none rounded-[12px] border border-white/40 bg-white/25 px-3 py-2 text-[12.5px] text-black/80 outline-none transition-colors duration-200 placeholder:text-black/25 focus:border-white/70 focus:bg-white/35"
              />
              <div className="flex w-[52px] shrink-0 flex-col items-center gap-0.5">
                <span className={cn('tabular text-[9px]', draft.length >= 140 ? 'text-brand' : 'text-black/25')}>
                  {draft.length}/140
                </span>
                <button
                  onClick={() => void submit()}
                  disabled={!draft.trim() || posting}
                  className="flex h-7 w-10 items-center justify-center rounded-full bg-brand text-white shadow-[0_6px_16px_rgba(255,25,73,0.25)] transition-all duration-200 enabled:hover:scale-105 enabled:active:scale-95 disabled:opacity-35"
                >
                  {posting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="mb-1 flex w-full items-center justify-center gap-2 rounded-[14px] border border-white/40 bg-white/20 py-2.5 text-[12px] text-black/50 transition-all duration-200 hover:bg-white/35 hover:text-black active:scale-[0.99]"
            >
              <MessageSquare size={14} />
              登录后参与评论
            </button>
          )}
        </footer>
      </motion.div>
    </motion.div>
  )
}

export function CommentsPanel(): React.JSX.Element {
  const song = useUiStore((state) => state.commentsFor)
  return (
    <AnimatePresence>
      {song && <CommentsPanelInner key={song.id} song={song} />}
    </AnimatePresence>
  )
}
