export const CREATE_SCHEMA = `
CREATE TABLE IF NOT EXISTS appearances (
  player_id   TEXT NOT NULL,
  club_id     TEXT NOT NULL,
  league_id   TEXT NOT NULL,
  season      INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  fixture_id  TEXT NOT NULL,
  week        INTEGER NOT NULL,
  opponent_id TEXT NOT NULL,
  result      TEXT NOT NULL,
  scoreline   TEXT NOT NULL,
  goals       INTEGER NOT NULL DEFAULT 0,
  assists     INTEGER NOT NULL DEFAULT 0,
  minutes     INTEGER NOT NULL DEFAULT 90,
  rating      REAL NOT NULL DEFAULT 0,
  position    TEXT,
  PRIMARY KEY (player_id, fixture_id)
);
CREATE INDEX IF NOT EXISTS idx_app_player        ON appearances(player_id);
CREATE INDEX IF NOT EXISTS idx_app_player_season ON appearances(player_id, season);
CREATE INDEX IF NOT EXISTS idx_app_club_season   ON appearances(club_id, season);

CREATE TABLE IF NOT EXISTS player_season_stats (
  player_id   TEXT NOT NULL,
  club_id     TEXT NOT NULL,
  league_id   TEXT NOT NULL,
  season      INTEGER NOT NULL,
  tier        INTEGER NOT NULL,
  appearances INTEGER NOT NULL DEFAULT 0,
  goals       INTEGER NOT NULL DEFAULT 0,
  assists     INTEGER NOT NULL DEFAULT 0,
  avg_rating  REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (player_id, club_id, league_id, season)
);
CREATE INDEX IF NOT EXISTS idx_pss_player ON player_season_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pss_club   ON player_season_stats(club_id);
CREATE INDEX IF NOT EXISTS idx_pss_league ON player_season_stats(league_id, season);

CREATE TABLE IF NOT EXISTS fixtures (
  id           TEXT PRIMARY KEY,
  league_id    TEXT NOT NULL,
  season       INTEGER NOT NULL,
  round        INTEGER NOT NULL,
  home_club_id TEXT NOT NULL,
  away_club_id TEXT NOT NULL,
  home_goals   INTEGER,
  away_goals   INTEGER,
  played_at    TEXT,
  synced       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_fix_league_season ON fixtures(league_id, season);
CREATE INDEX IF NOT EXISTS idx_fix_home          ON fixtures(home_club_id);
CREATE INDEX IF NOT EXISTS idx_fix_away          ON fixtures(away_club_id);

CREATE TABLE IF NOT EXISTS match_results (
  fixture_id      TEXT PRIMARY KEY,
  season          INTEGER NOT NULL,
  home_club_id    TEXT NOT NULL,
  away_club_id    TEXT NOT NULL,
  home_goals      INTEGER NOT NULL,
  away_goals      INTEGER NOT NULL,
  home_avg_rating REAL,
  away_avg_rating REAL,
  home_players    TEXT NOT NULL,
  away_players    TEXT NOT NULL,
  played_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mr_season    ON match_results(season);
CREATE INDEX IF NOT EXISTS idx_mr_home_club ON match_results(home_club_id);
CREATE INDEX IF NOT EXISTS idx_mr_away_club ON match_results(away_club_id);
`;
