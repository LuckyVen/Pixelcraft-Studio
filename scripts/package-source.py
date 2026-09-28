from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
output = root / 'public' / 'pixelcraft-studio-source.zip'
exclude_dirs = {'node_modules', '.git', '.sites-runtime', '.agents', '.codex', '.wrangler', '.next', '.vinext', 'dist', 'out', 'outputs', 'work', 'coverage', '__pycache__'}
files = []
for path in root.rglob('*'):
    if not path.is_file() or path == output:
        continue
    relative = path.relative_to(root)
    if any(part in exclude_dirs for part in relative.parts):
        continue
    if path.name.startswith('.env') or path.suffix in {'.tsbuildinfo', '.log', '.pem', '.tgz'}:
        continue
    files.append((path, relative))
with ZipFile(output, 'w', ZIP_DEFLATED, compresslevel=8) as archive:
    for path, relative in sorted(files):
        archive.write(path, Path('pixelcraft-studio') / relative)
with ZipFile(output) as archive:
    assert archive.testzip() is None
print(f'Packaged {len(files)} files; {output.stat().st_size:,} bytes')
