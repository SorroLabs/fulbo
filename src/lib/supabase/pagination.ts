const PAGE_SIZE = 1000

/**
 * Supabase/PostgREST caps every response at a server-side max-rows limit
 * (1000 on this project), regardless of any larger .range() requested by
 * the client. Queries that can return more rows than that (e.g. all
 * predictions for every member of a prono) must paginate or they silently
 * lose rows past the cutoff.
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = []
  let offset = 0
  while (true) {
    const { data, error } = await query(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return all
}
