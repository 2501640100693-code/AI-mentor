# 00b — Verification pass corrections (applied in patched prompts)

Patches below are **already applied** in context/02–14. Reference only.

| Patch | Fix |
|---|---|
| chromadb | `>=1.0.0`, numpy `>=1.26.0` |
| Next.js | `create-next-app@latest --yes` |
| GEMINI_MODEL | env var in llm.py |
| Sarvam speaker | `shubh` not `anushka` |
| pip install | venv on Windows, not `--break-system-packages` |
| verify commands | `python`, PowerShell Select-String / Invoke-RestMethod |
| Frontend | +three, @react-three/fiber, @react-three/drei, framer-motion |

Chroma smoke test (run in Phase 0 after pip install):

```python
import chromadb
c = chromadb.PersistentClient(path="./chroma_data_test")
col = c.get_or_create_collection(name="smoketest")
col.add(ids=["1"], embeddings=[[0.1,0.2]], documents=["a"], metadatas=[{"k":"x"}])
print(col.query(query_embeddings=[[0.1,0.2]], n_results=1))
import shutil; shutil.rmtree("./chroma_data_test")
```
