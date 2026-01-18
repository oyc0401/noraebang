# Song Mapper MCP Server

곡-유튜브 영상 매핑을 위한 MCP 서버

## 설치

```bash
cd mcp-server
pnpm install
```

## 환경 설정

```bash
cp .env.example .env
# .env 파일에 DATABASE_URL 설정
```

## Claude Code에 등록

`~/.claude/claude_desktop_config.json` 또는 프로젝트의 `.claude/settings.json`:

```json
{
  "mcpServers": {
    "song-mapper": {
      "command": "npx",
      "args": ["tsx", "/Users/yuchan/developer/song/mcp-server/src/index.ts"],
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/song_db"
      }
    }
  }
}
```

## 제공 Tool

### get_unmapped_data

아티스트의 매핑 안된 곡과 유튜브 영상 조회 (조회수 100만 이상)

```json
{ "artistId": 158 }
```

### apply_mapping

곡-영상 매핑 적용

```json
{
  "artistId": 158,
  "song": [
    {
      "songId": 8960,
      "songTitle": "残響散歌",
      "videoId": "d6NPs3OQIAU",
      "videoName": "Zankyosanka"
    }
  ]
}
```
