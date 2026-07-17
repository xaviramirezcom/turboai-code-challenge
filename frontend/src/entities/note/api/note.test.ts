import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNote, deleteNote, listNotes, updateNote } from './note';

function stub(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const NOTE = {
  id: 'abc',
  title: '',
  content: '',
  category_id: 1,
  category: { id: 1, name: 'Random Thoughts', color: '#EF9C66' },
  created_at: '2024-07-21T20:39:00Z',
  last_edited_at: '2024-07-21T20:39:00Z',
};

afterEach(() => vi.restoreAllMocks());

describe('note api', () => {
  it('createNote POSTs an empty body by default', async () => {
    const fetchMock = stub(201, NOTE);
    const note = await createNote();
    expect(note.id).toBe('abc');
    const [url, init] = [
      fetchMock.mock.calls[0]?.[0],
      fetchMock.mock.calls[0]?.[1],
    ];
    expect(String(url)).toContain('/notes/');
    expect(init.method).toBe('POST');
  });

  it('updateNote PATCHes the given fields', async () => {
    const fetchMock = stub(200, { ...NOTE, title: 'Hi' });
    const note = await updateNote('abc', { title: 'Hi' });
    expect(note.title).toBe('Hi');
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ title: 'Hi' });
  });

  it('listNotes adds the category query when filtering', async () => {
    const fetchMock = stub(200, [NOTE]);
    await listNotes(7);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/notes/?category=7',
    );
  });

  it('deleteNote issues a DELETE', async () => {
    const fetchMock = stub(204, null);
    await deleteNote('abc');
    const init = fetchMock.mock.calls[0]?.[1];
    expect(init.method).toBe('DELETE');
  });
});
