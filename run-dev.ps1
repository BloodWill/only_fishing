# Ensure venv active
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
  py -3.12 -m venv .venv
}
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
pip install watchfiles
