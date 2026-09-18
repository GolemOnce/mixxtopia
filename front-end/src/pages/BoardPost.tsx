import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'

type Category = 'notice' | 'free' | 'question' | 'suggestion'

interface PostItem {
  post_id: string
  post_num: number
  author: string
  category: Category
  title: string
  content: string
  created_at: string
  updated_at: string | null
}

interface CommentItem {
  comment_id: string
  post_id: string
  author: string
  parent_id: string | null
  mention_to: string | null
  content: string
  created_at: string
  reply_count: number
  replies: CommentItem[]
}

interface CommentListResponse {
  items: CommentItem[]
  total: number
  page: number
  page_size: number
}

const CATEGORY_LABELS: Record<Category, string> = {
  notice: '공지',
  free: '자유',
  question: '질문',
  suggestion: '건의',
}

const COMMENT_PAGE_SIZE = 20

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function BoardPost() {
  const { postId } = useParams<{ postId: string }>()
  const navigate = useNavigate()

  const [post, setPost] = useState<PostItem | null>(null)
  const [postError, setPostError] = useState<string | null>(null)
  const [loadingPost, setLoadingPost] = useState(true)

  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentTotal, setCommentTotal] = useState(0)
  const [commentPage, setCommentPage] = useState(1)
  const [commentSort, setCommentSort] = useState<'asc' | 'desc'>('asc')
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentListError, setCommentListError] = useState<string | null>(null)

  const [commentContent, setCommentContent] = useState('')
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentError, setCommentError] = useState<string | null>(null)

  async function loadPost() {
    if (!postId) return
    setLoadingPost(true)
    setPostError(null)
    try {
      const data = await api.get<PostItem>(`/api/posts/${postId}`)
      setPost(data)
      setEditTitle(data.title)
      setEditContent(data.content)
    } catch (err) {
      setPostError(authErrorMessage(err, '게시글을 불러오지 못했습니다.'))
    } finally {
      setLoadingPost(false)
    }
  }

  async function loadComments() {
    if (!postId) return
    setLoadingComments(true)
    setCommentListError(null)
    try {
      const query = new URLSearchParams({
        sort: commentSort,
        page: String(commentPage),
        page_size: String(COMMENT_PAGE_SIZE),
      })
      const data = await api.get<CommentListResponse>(`/api/comments/${postId}?${query.toString()}`)
      setComments(data.items)
      setCommentTotal(data.total)
    } catch (err) {
      setCommentListError(authErrorMessage(err, '댓글을 불러오지 못했습니다.'))
      setComments([])
      setCommentTotal(0)
    } finally {
      setLoadingComments(false)
    }
  }

  useEffect(() => {
    loadPost()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, commentSort, commentPage])

  async function handleDeletePost() {
    if (!postId) return
    if (!confirm('이 게시글을 삭제할까요?')) return
    try {
      await api.delete(`/api/posts/${postId}`)
      navigate('/board')
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!postId) return
    setEditError(null)
    setEditSubmitting(true)
    try {
      await api.patch(`/api/posts/${postId}`, { title: editTitle, content: editContent })
      setEditing(false)
      await loadPost()
    } catch (err) {
      setEditError(authErrorMessage(err, '수정 중 오류가 발생했습니다.'))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function handleCommentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!postId) return
    setCommentError(null)
    setCommentSubmitting(true)
    try {
      await api.post(`/api/comments/${postId}`, {
        content: commentContent,
        parent_id: replyTo?.id ?? null,
      })
      setCommentContent('')
      setReplyTo(null)
      setCommentPage(1)
      await loadComments()
    } catch (err) {
      setCommentError(authErrorMessage(err, '댓글 등록 중 오류가 발생했습니다.'))
    } finally {
      setCommentSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!confirm('이 댓글을 삭제할까요?')) return
    try {
      await api.delete(`/api/comments/${commentId}`)
      await loadComments()
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  function renderComment(c: CommentItem) {
    return (
      <>
        <div className="muted">
          {c.author}
          {c.mention_to && <> → @{c.mention_to}</>} · {formatDate(c.created_at)}
        </div>
        <div>{c.content}</div>
        <div className="row">
          <button type="button" onClick={() => setReplyTo({ id: c.comment_id, author: c.author })}>
            답글
          </button>
          <button type="button" onClick={() => handleDeleteComment(c.comment_id)}>
            삭제
          </button>
        </div>
      </>
    )
  }

  const commentTotalPages = Math.max(1, Math.ceil(commentTotal / COMMENT_PAGE_SIZE))

  if (loadingPost) return <div className="card muted">불러오는 중...</div>
  if (postError) return <div className="card muted warn">{postError}</div>
  if (!post) return null

  return (
    <div className="card">
      <div className="muted">
        [{CATEGORY_LABELS[post.category]} #{post.post_num}]
      </div>
      <h1>{post.title}</h1>
      <div className="muted">
        {post.author} · {formatDate(post.created_at)}
        {post.updated_at && ' (수정됨)'}
      </div>

      {!editing && (
        <>
          <pre>{post.content}</pre>
          <div className="row">
            <button type="button" onClick={() => setEditing(true)}>
              수정
            </button>
            <button type="button" onClick={handleDeletePost}>
              삭제
            </button>
          </div>
        </>
      )}

      {editing && (
        <form onSubmit={handleEditSubmit}>
          <div className="row">
            <label>
              제목{' '}
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                maxLength={100}
                required
              />
            </label>
          </div>
          <div className="row">
            <label>
              내용{' '}
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={1000}
                required
              />
            </label>
          </div>
          <div className="row">
            <button className="primary" type="submit" disabled={editSubmitting}>
              {editSubmitting ? '저장 중...' : '저장'}
            </button>
            <button type="button" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
          {editError && <div className="muted warn">{editError}</div>}
        </form>
      )}

      <h3>댓글 {commentTotal}개</h3>
      <div className="row">
        <label>
          정렬{' '}
          <select
            value={commentSort}
            onChange={(e) => {
              setCommentSort(e.target.value as 'asc' | 'desc')
              setCommentPage(1)
            }}
          >
            <option value="asc">등록순</option>
            <option value="desc">최신순</option>
          </select>
        </label>
      </div>

      {loadingComments && <div className="muted">불러오는 중...</div>}
      {commentListError && <div className="muted warn">{commentListError}</div>}
      {!loadingComments && !commentListError && comments.length === 0 && (
        <div className="muted">댓글이 없습니다.</div>
      )}

      {comments.map((c) => (
        <div className="list-item" key={c.comment_id}>
          {renderComment(c)}
          {c.replies.length > 0 && (
            <div className="reply-list">
              {c.replies.map((r) => (
                <div key={r.comment_id}>{renderComment(r)}</div>
              ))}
            </div>
          )}
        </div>
      ))}

      {commentTotalPages > 1 && (
        <div className="row">
          <button
            type="button"
            disabled={commentPage <= 1}
            onClick={() => setCommentPage((p) => p - 1)}
          >
            이전
          </button>
          <span className="muted">
            {commentPage} / {commentTotalPages}
          </span>
          <button
            type="button"
            disabled={commentPage >= commentTotalPages}
            onClick={() => setCommentPage((p) => p + 1)}
          >
            다음
          </button>
        </div>
      )}

      <form onSubmit={handleCommentSubmit}>
        {replyTo && (
          <div className="muted">
            {replyTo.author}님에게 답글 작성 중{' '}
            <button type="button" onClick={() => setReplyTo(null)}>
              취소
            </button>
          </div>
        )}
        <div className="row">
          <textarea
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            maxLength={100}
            placeholder="댓글을 입력하세요"
            required
          />
        </div>
        <div className="row">
          <button className="primary" type="submit" disabled={commentSubmitting}>
            {commentSubmitting ? '등록 중...' : '댓글 등록'}
          </button>
        </div>
      </form>
      {commentError && <div className="muted warn">{commentError}</div>}
    </div>
  )
}
