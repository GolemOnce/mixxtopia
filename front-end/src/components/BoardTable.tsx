import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export interface BoardTableColumn<T> {
  key: string
  label: string
  className: string
  render: (item: T, index: number) => ReactNode
}

interface BoardTableProps<T> {
  items: T[]
  columns: BoardTableColumn<T>[]
  titleColumnKey: string
  rowKey: (item: T) => string
  linkTo: (item: T) => string
  emptyMessage?: string
}

// Board/Official 목록, 게시글 상세 하단의 "다른 글" 목록에서 공용으로 쓰는 테이블.
// PC에서는 table, 모바일에서는 CSS로 table을 숨기고 카드 리스트를 보여준다(.board-list).
// items가 비어 있어도 헤더(번호/글종류/제목...)는 그대로 보여주고, 그 안에 emptyMessage를 띄운다.
export default function BoardTable<T>({
  items,
  columns,
  titleColumnKey,
  rowKey,
  linkTo,
  emptyMessage,
}: BoardTableProps<T>) {
  const titleColumn = columns.find((c) => c.key === titleColumnKey)
  const metaColumns = columns.filter((c) => c.key !== titleColumnKey)
  const isEmpty = items.length === 0

  return (
    <>
      <table className="board-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={c.className}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isEmpty ? (
            <tr>
              <td colSpan={columns.length} className="board-table-empty muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={rowKey(item)}>
                {columns.map((c) =>
                  c.key === titleColumnKey ? (
                    <td key={c.key} className={c.className}>
                      <Link to={linkTo(item)}>{c.render(item, index)}</Link>
                    </td>
                  ) : (
                    <td key={c.key} className={`${c.className} muted`}>
                      {c.render(item, index)}
                    </td>
                  ),
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="board-list">
        {isEmpty ? (
          <div className="muted board-list-empty">{emptyMessage}</div>
        ) : (
          items.map((item, index) => (
            <Link to={linkTo(item)} className="board-list-item" key={rowKey(item)}>
              <div className="board-list-title">{titleColumn?.render(item, index)}</div>
              <div className="muted board-list-meta">
                {metaColumns.map((c, i) => (
                  <span key={c.key}>
                    {i > 0 && ' · '}
                    {c.render(item, index)}
                  </span>
                ))}
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
