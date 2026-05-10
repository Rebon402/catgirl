import { get, run } from '../sqlite';

interface AlexConfig {
  allow: string[];
  profanitySureness: 0 | 1 | 2;
  noBinary: boolean;
}

export interface ServerConfig {
  serverId: string;
  alexConfig?: AlexConfig;
  bannedWordConfig?: string[];
}

interface ServerConfigRow {
  server_id: string;
  alex_allow: string;
  profanity_sureness: number;
  no_binary: number;
  banned_words: string;
}

type ServerConfigFilter = {
  serverId?: string | null;
};

type ServerConfigUpdate = {
  $set?: {
    bannedWordConfig?: string[];
  };
  $push?: {
    bannedWordConfig?: string;
    'alexConfig.allow'?: string;
  };
  $pull?: {
    bannedWordConfig?: string;
    'alexConfig.allow'?: string;
  };
};

type FindOneAndUpdateOptions = {
  new?: boolean;
};

const defaultAlexConfig: AlexConfig = {
  allow: [],
  profanitySureness: 1,
  noBinary: false,
};

const parseJsonArray = (value: string): string[] => {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item));
    }
    return [];
  } catch {
    return [];
  }
};

const toEntity = (row: ServerConfigRow): ServerConfig => ({
  serverId: row.server_id,
  alexConfig: {
    allow: parseJsonArray(row.alex_allow),
    profanitySureness: row.profanity_sureness as 0 | 1 | 2,
    noBinary: Boolean(row.no_binary),
  },
  bannedWordConfig: parseJsonArray(row.banned_words),
});

const normalize = (config: ServerConfig): Required<ServerConfig> => ({
  serverId: config.serverId,
  alexConfig: {
    allow: [...(config.alexConfig?.allow ?? defaultAlexConfig.allow)],
    profanitySureness:
      config.alexConfig?.profanitySureness ?? defaultAlexConfig.profanitySureness,
    noBinary: config.alexConfig?.noBinary ?? defaultAlexConfig.noBinary,
  },
  bannedWordConfig: [...(config.bannedWordConfig ?? [])],
});

const findOne = async (
  filter: ServerConfigFilter,
): Promise<ServerConfig | null> => {
  if (!filter.serverId) {
    return null;
  }

  const row = await get<ServerConfigRow>(
    `
      SELECT
        server_id,
        alex_allow,
        profanity_sureness,
        no_binary,
        banned_words
      FROM server_configs
      WHERE server_id = ?
      LIMIT 1;
    `,
    [filter.serverId],
  );

  return row ? toEntity(row) : null;
};

const create = async (config: ServerConfig): Promise<ServerConfig> => {
  const normalized = normalize(config);

  await run(
    `
      INSERT INTO server_configs (
        server_id,
        alex_allow,
        profanity_sureness,
        no_binary,
        banned_words
      ) VALUES (?, ?, ?, ?, ?);
    `,
    [
      normalized.serverId,
      JSON.stringify(normalized.alexConfig.allow),
      normalized.alexConfig.profanitySureness,
      normalized.alexConfig.noBinary ? 1 : 0,
      JSON.stringify(normalized.bannedWordConfig),
    ],
  );

  return normalized;
};

const findOneAndUpdate = async (
  filter: ServerConfigFilter,
  update: ServerConfigUpdate,
  options: FindOneAndUpdateOptions = {},
): Promise<ServerConfig | null> => {
  const current = await findOne(filter);
  if (!current) {
    return null;
  }

  const next = normalize(current);

  if (update.$set?.bannedWordConfig) {
    next.bannedWordConfig = [...update.$set.bannedWordConfig];
  }

  if (typeof update.$push?.bannedWordConfig === 'string') {
    next.bannedWordConfig.push(update.$push.bannedWordConfig);
  }

  if (typeof update.$push?.['alexConfig.allow'] === 'string') {
    next.alexConfig.allow.push(update.$push['alexConfig.allow']);
  }

  if (typeof update.$pull?.bannedWordConfig === 'string') {
    next.bannedWordConfig = next.bannedWordConfig.filter(
      (word) => word !== update.$pull?.bannedWordConfig,
    );
  }

  if (typeof update.$pull?.['alexConfig.allow'] === 'string') {
    next.alexConfig.allow = next.alexConfig.allow.filter(
      (word) => word !== update.$pull?.['alexConfig.allow'],
    );
  }

  await run(
    `
      UPDATE server_configs
      SET
        alex_allow = ?,
        profanity_sureness = ?,
        no_binary = ?,
        banned_words = ?
      WHERE server_id = ?;
    `,
    [
      JSON.stringify(next.alexConfig.allow),
      next.alexConfig.profanitySureness,
      next.alexConfig.noBinary ? 1 : 0,
      JSON.stringify(next.bannedWordConfig),
      next.serverId,
    ],
  );

  return options.new ? next : current;
};

const ServerConfigModel = {
  findOne,
  create,
  findOneAndUpdate,
};

export default ServerConfigModel;
