import { useState } from 'react'
import { Link } from 'react-router-dom'

import { api, authErrorMessage } from '../api/client'
import { useScheduleCategories, type ScheduleCategoryItem } from '../lib/scheduleCategories'

const DEFAULT_COLOR = '#94a3b8'

export default function AdminScheduleCategory() {
  const { categories, loading, refetch } = useScheduleCategories()

  const [categoryId, setCategoryId] = useState('')
  const [label, setLabel] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editLabel, setEditLabel] = useState('')
  const [editColor, setEditColor] = useState('')
  const [rowError, setRowError] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSubmitting(true)
    try {
      await api.post('/api/schedule-categories', { category_id: categoryId, label, color })
      setCategoryId('')
      setLabel('')
      setColor(DEFAULT_COLOR)
      await refetch()
    } catch (err) {
      setFormError(authErrorMessage(err, '추가 중 오류가 발생했습니다.'))
    } finally {
      setSubmitting(false)
    }
  }

  function startEdit(c: ScheduleCategoryItem) {
    setEditingId(c.category_id)
    setEditLabel(c.label)
    setEditColor(c.color)
    setRowError(null)
  }

  async function handleUpdate(id: string) {
    setRowError(null)
    try {
      await api.patch(`/api/schedule-categories/${id}`, { label: editLabel, color: editColor })
      setEditingId(null)
      await refetch()
    } catch (err) {
      setRowError(authErrorMessage(err, '수정 중 오류가 발생했습니다.'))
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('이 종류를 삭제할까요? 이미 등록된 일정의 종류 표시에는 영향을 줄 수 있습니다.'))
      return
    try {
      await api.delete(`/api/schedule-categories/${id}`)
      await refetch()
    } catch (err) {
      alert(authErrorMessage(err, '삭제 중 오류가 발생했습니다.'))
    }
  }

  return (
    <div className="card">
      <div className="row">
        <Link to="/admin">관리자 메뉴로</Link>
      </div>
      <h1>일정 종류 관리</h1>

      {loading && <div className="muted">불러오는 중...</div>}

      {categories.map((c) => (
        <div className="row" key={c.category_id}>
          <span className="calendar-dot" style={{ background: c.color }} />
          {editingId === c.category_id ? (
            <>
              <input
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                maxLength={20}
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
              />
              <button type="button" onClick={() => handleUpdate(c.category_id)}>
                저장
              </button>
              <button type="button" onClick={() => setEditingId(null)}>
                취소
              </button>
            </>
          ) : (
            <>
              <span>{c.label}</span>
              <span className="muted">({c.category_id})</span>
              <button type="button" onClick={() => startEdit(c)}>
                수정
              </button>
              <button type="button" onClick={() => handleDelete(c.category_id)}>
                삭제
              </button>
            </>
          )}
        </div>
      ))}
      {rowError && <div className="muted warn">{rowError}</div>}

      <h3>새 종류 추가</h3>
      <form onSubmit={handleCreate}>
        <div className="row">
          <label>
            키{' '}
            <input
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="영문 소문자/숫자/_ (예: live)"
              pattern="[a-z0-9_]+"
              maxLength={20}
              required
            />
          </label>
          <label>
            이름{' '}
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={20}
              required
            />
          </label>
          <label>
            색상 <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
        </div>
        <div className="row">
          <button className="primary" type="submit" disabled={submitting}>
            {submitting ? '추가 중...' : '추가'}
          </button>
        </div>
      </form>
      {formError && <div className="muted warn">{formError}</div>}
    </div>
  )
}
