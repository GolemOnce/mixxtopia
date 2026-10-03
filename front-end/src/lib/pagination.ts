export type PageToken = number | 'ellipsis'

// 항상 처음/끝 페이지를 보여주고, 현재 페이지 좌우로 siblingCount개씩 보여준 뒤
// 그 사이는 "..."으로 줄인다. (예: 1 ... 4 5 6 ... 72)
export function getPaginationRange(current: number, total: number, siblingCount = 1): PageToken[] {
  const totalNumbers = siblingCount * 2 + 5
  if (total <= totalNumbers) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(current - siblingCount, 1)
  const rightSiblingIndex = Math.min(current + siblingCount, total)

  const showLeftEllipsis = leftSiblingIndex > 2
  const showRightEllipsis = rightSiblingIndex < total - 1

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + siblingCount * 2
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
    return [...leftRange, 'ellipsis', total]
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + siblingCount * 2
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => total - rightItemCount + 1 + i,
    )
    return [1, 'ellipsis', ...rightRange]
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i,
  )
  return [1, 'ellipsis', ...middleRange, 'ellipsis', total]
}
