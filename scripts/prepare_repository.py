"""Initialize and commit source locally without depending on system Git.

Requires optional dulwich. Never publishes or rewrites existing history.
"""
from pathlib import Path
from dulwich import porcelain
from package_source import source_files

root = Path(__file__).resolve().parents[1]
if (root/'.git').exists():
    raise SystemExit('A Git repository already exists; inspect it rather than reinitializing.')
repo = porcelain.init(str(root))
porcelain.add(repo, paths=[str(path.relative_to(root)) for path in source_files()])
commit = porcelain.commit(repo, message=b'Build wind forecast procurement pilot',
                          author=b'Pilot Engineering <pilot@example.invalid>',
                          committer=b'Pilot Engineering <pilot@example.invalid>')
repo.refs[b'refs/heads/main'] = commit
repo.refs.set_symbolic_ref(b'HEAD', b'refs/heads/main')
if b'refs/heads/master' in repo.refs:
    del repo.refs[b'refs/heads/master']
print(f'Local source commit created: {commit.decode()}')
print('Public GitHub repository: not created; authenticated publication is still required.')
