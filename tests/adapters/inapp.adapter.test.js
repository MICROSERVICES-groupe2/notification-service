const inappAdapter = require('../../src/adapters/inapp.adapter');

describe('InAppAdapter Tests', () => {
  let mockIo;
  let mockRoomEmit;

  beforeEach(() => {
    jest.clearAllMocks();
    inappAdapter.unreadStore.clear();

    mockRoomEmit = jest.fn();
    mockIo = {
      sockets: {
        adapter: {
          rooms: {
            get: jest.fn()
          }
        }
      },
      to: jest.fn().mockReturnValue({
        emit: mockRoomEmit
      })
    };
  });

  test('should buffer notification when user is offline', async () => {
    inappAdapter.setIo(mockIo);
    // User room has no active connections (get returns null or empty set)
    mockIo.sockets.adapter.rooms.get.mockReturnValue(null);

    const result = await inappAdapter.send({
      to: 'user123',
      subject: 'Offline Alert',
      body: 'You missed this'
    });

    expect(mockIo.to).not.toHaveBeenCalled();
    expect(inappAdapter.unreadStore.has('user123')).toBe(true);
    expect(inappAdapter.unreadStore.get('user123')).toHaveLength(1);
    expect(inappAdapter.unreadStore.get('user123')[0].body).toBe('You missed this');
    expect(result.body).toBe('You missed this');
  });

  test('should emit directly when user is online', async () => {
    inappAdapter.setIo(mockIo);
    // User room has 1 active connection (size > 0)
    mockIo.sockets.adapter.rooms.get.mockReturnValue(new Set(['socket_id_1']));

    await inappAdapter.send({
      to: 'user456',
      subject: 'Online Alert',
      body: 'Realtime data'
    });

    expect(mockIo.to).toHaveBeenCalledWith('user:user456');
    expect(mockRoomEmit).toHaveBeenCalledWith('notification', expect.objectContaining({
      title: 'Online Alert',
      body: 'Realtime data'
    }));
    expect(inappAdapter.unreadStore.has('user456')).toBe(false);
  });

  test('should flush unread notifications when user comes online', async () => {
    inappAdapter.setIo(mockIo);
    mockIo.sockets.adapter.rooms.get.mockReturnValue(null);

    // Send two offline notifications
    await inappAdapter.send({ to: 'user789', body: 'Msg 1' });
    await inappAdapter.send({ to: 'user789', body: 'Msg 2' });

    expect(inappAdapter.unreadStore.get('user789')).toHaveLength(2);

    const unread = inappAdapter.flushUnread('user789');
    expect(unread).toHaveLength(2);
    expect(unread[0].body).toBe('Msg 1');
    expect(unread[1].body).toBe('Msg 2');
    
    // Store should now be empty for that user
    expect(inappAdapter.unreadStore.has('user789')).toBe(false);
  });
});
