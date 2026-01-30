from fastapi import APIRouter, File, UploadFile, HTTPException
import threading
try:
    from .vision import _detect_from_bytes
except Exception:
    from vision import _detect_from_bytes
try:
    from .inferencia import generate_sync
except Exception:
    from inferencia import generate_sync

router = APIRouter()

# Simple orchestrator: run vision.detect, then optionally LLM generate
@router.post('/orchestrate')
async def orchestrate(file: UploadFile = File(...), run_llm: bool = False):
    try:
        contents = await file.read()
        result = {}

        def _run():
            try:
                r = _detect_from_bytes(contents)
                result['vision'] = r
                if run_llm:
                    r2 = generate_sync({'prompt': 'interpret', 'data': r})
                    result['llm'] = r2
            except Exception as e:
                result['error'] = str(e)

        t = threading.Thread(target=_run)
        t.start()
        t.join(timeout=10)
        if 'error' in result:
            raise Exception(result['error'])
        return {'ok': True, 'result': result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
