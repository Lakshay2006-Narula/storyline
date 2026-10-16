import sqlite3, os

db_path = 'news_pulse.db'
size = os.path.getsize(db_path)
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row

tables = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
art_count = conn.execute('SELECT COUNT(*) FROM articles').fetchone()[0]
cluster_count = conn.execute('SELECT COUNT(*) FROM clusters').fetchone()[0]

print('== Your Current Database ==')
print(f'File     : {db_path}')
print(f'Size     : {round(size/1024, 1)} KB')
print(f'Tables   : {[t["name"] for t in tables]}')
print(f'Articles : {art_count}')
print(f'Clusters : {cluster_count}')
print()

print('== Schema ==')
for table in ['articles', 'clusters', 'cluster_articles']:
    cols = conn.execute(f'PRAGMA table_info({table})').fetchall()
    print(f'\n[{table}]')
    for col in cols:
        print(f'  {col["name"]:20} {col["type"]}')

conn.close()
