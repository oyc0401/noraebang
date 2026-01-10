## sql 얻기
pg_dump -h localhost -p 5432 -d song_db 
  -U postgres -s -F p -E UTF-8 
  -f schema_export.sql

## dbml 변환
sql2dbml schema.sql --out-file schema.dbml