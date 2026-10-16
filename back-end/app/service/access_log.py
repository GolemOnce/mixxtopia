from app.core.access_log import AccessLogAction, access_logs_col


async def list_access_logs(
    action: AccessLogAction | None,
    user_id: str | None,
    page: int,
    page_size: int,
) -> tuple[list[dict], int]:
    query: dict = {}
    if action is not None:
        query["action"] = action.value
    if user_id is not None:
        query["user_id"] = user_id

    total = await access_logs_col.count_documents(query)
    skip = (page - 1) * page_size
    docs = [
        doc
        async for doc in access_logs_col.find(query)
        .sort("created_at", -1)
        .skip(skip)
        .limit(page_size)
    ]
    return docs, total
