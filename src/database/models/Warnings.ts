import { get, run } from '../sqlite';

export interface WarningRecord {
  serverId: string;
  messageId: string;
  channelId: string;
  warningId: string;
  remove: () => Promise<void>;
}

interface WarningRow {
  server_id: string;
  message_id: string;
  channel_id: string;
  warning_id: string;
}

type WarningFilter = {
  serverId?: string | null;
  messageId?: string | null;
  channelId?: string | null;
};

type WarningCreateInput = {
  serverId: string;
  messageId: string;
  channelId: string;
  warningId: string;
};

const toEntity = (row: WarningRow): WarningRecord => ({
  serverId: row.server_id,
  messageId: row.message_id,
  channelId: row.channel_id,
  warningId: row.warning_id,
  remove: async () => {
    await run('DELETE FROM warnings WHERE warning_id = ?;', [row.warning_id]);
  },
});

const findOne = async (
  filter: WarningFilter,
): Promise<WarningRecord | null> => {
  if (!filter.serverId || !filter.messageId || !filter.channelId) {
    return null;
  }

  const row = await get<WarningRow>(
    `
      SELECT server_id, message_id, channel_id, warning_id
      FROM warnings
      WHERE server_id = ? AND message_id = ? AND channel_id = ?
      LIMIT 1;
    `,
    [filter.serverId, filter.messageId, filter.channelId],
  );

  return row ? toEntity(row) : null;
};

const create = async (data: WarningCreateInput): Promise<WarningRecord> => {
  await run(
    `
      INSERT INTO warnings (warning_id, server_id, message_id, channel_id)
      VALUES (?, ?, ?, ?);
    `,
    [data.warningId, data.serverId, data.messageId, data.channelId],
  );

  return {
    ...data,
    remove: async () => {
      await run('DELETE FROM warnings WHERE warning_id = ?;', [data.warningId]);
    },
  };
};

const WarningsModel = {
  findOne,
  create,
};

export default WarningsModel;
