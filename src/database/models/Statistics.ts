import { all, get, run } from '../sqlite';

export interface Statistics {
  serverId: string;
  totalTriggers: number;
  totalTriggersFixed: number;
  totalWordTriggers: {
    [key: string]: number;
  };
}

interface StatisticsRow {
  server_id: string;
  total_triggers: number;
  total_triggers_fixed: number;
}

type StatisticsFilter = {
  serverId?: string | null;
};

type StatisticsUpdate = {
  $inc?: {
    totalTriggers?: number;
    totalTriggersFixed?: number;
  };
};

type StatisticsOptions = {
  upsert?: boolean;
};

const toEntity = (row: StatisticsRow): Statistics => ({
  serverId: row.server_id,
  totalTriggers: row.total_triggers,
  totalTriggersFixed: row.total_triggers_fixed,
  totalWordTriggers: {},
});

const find = async (_filter: Record<string, never> = {}): Promise<Statistics[]> => {
  const rows = await all<StatisticsRow>(
    `
      SELECT server_id, total_triggers, total_triggers_fixed
      FROM statistics
      ORDER BY server_id ASC;
    `,
  );

  return rows.map(toEntity);
};

const findOneAndUpdate = (
  filter: StatisticsFilter,
  update: StatisticsUpdate,
  options: StatisticsOptions = {},
) => ({
  exec: async (): Promise<Statistics | null> => {
    if (!filter.serverId) {
      return null;
    }

    const incrementTriggers = update.$inc?.totalTriggers ?? 0;
    const incrementFixed = update.$inc?.totalTriggersFixed ?? 0;

    if (options.upsert) {
      await run(
        `
          INSERT INTO statistics (server_id, total_triggers, total_triggers_fixed)
          VALUES (?, ?, ?)
          ON CONFLICT(server_id) DO UPDATE SET
            total_triggers = total_triggers + excluded.total_triggers,
            total_triggers_fixed = total_triggers_fixed + excluded.total_triggers_fixed;
        `,
        [filter.serverId, incrementTriggers, incrementFixed],
      );
    } else {
      await run(
        `
          UPDATE statistics
          SET
            total_triggers = total_triggers + ?,
            total_triggers_fixed = total_triggers_fixed + ?
          WHERE server_id = ?;
        `,
        [incrementTriggers, incrementFixed, filter.serverId],
      );
    }

    const row = await get<StatisticsRow>(
      `
        SELECT server_id, total_triggers, total_triggers_fixed
        FROM statistics
        WHERE server_id = ?
        LIMIT 1;
      `,
      [filter.serverId],
    );

    return row ? toEntity(row) : null;
  },
});

const StatisticsModel = {
  find,
  findOneAndUpdate,
};

export default StatisticsModel;
