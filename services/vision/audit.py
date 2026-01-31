import functools, asyncio, traceback
from time import perf_counter
from state import state

def audit(task):
  def deco(fn):
    @functools.wraps(fn)
    async def wrapper(*a, **kw):
      t0 = perf_counter()
      state['counters']['tasks'].setdefault(task,0); state['counters']['tasks'][task]+=1
      try:
        if asyncio.iscoroutinefunction(fn):
          res = await fn(*a, **kw)
        else:
          loop = asyncio.get_running_loop()
          res = await loop.run_in_executor(None, functools.partial(fn,*a,**kw))
        dur = (perf_counter()-t0)*1000
        state['audit'] = {'last_op':task,'last_status':'ok','last_latency_ms':dur}
        # If the wrapped function included detected_class in its response, propagate to audit
        if isinstance(res, dict) and 'detected_class' in res:
          state['audit']['detected_class'] = res.get('detected_class')
        if isinstance(res, dict): res['took_ms']=round(dur,2)
        return res
      except Exception as e:
        dur = (perf_counter()-t0)*1000
        tb = traceback.format_exc()
        state['counters']['errors']+=1
        state['audit'] = {'last_op':task,'last_status':'error','last_latency_ms':dur,'last_error':tb}
        return {'ok':False,'error':str(e),'traceback':tb,'took_ms':round(dur,2)}
    return wrapper
  return deco