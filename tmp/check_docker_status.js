(async()=>{
  try{
    const { discoverContainer } = await import('../lib/dockerDiscover.js')
    const found = await discoverContainer('vision|ranitas-vision|ranitas-vision:')
    console.log('foundVision:', found)
    if(found && found.candidate){
      const { exec } = require('child_process')
      const { promisify } = require('util')
      const execP = promisify(exec)
      const cmd = `docker exec ${found.candidate} curl -sS -w "\n__STATUS_CODE__:%{http_code}" http://127.0.0.1:8000/status`
      console.log('cmd:', cmd)
      const res = await execP(cmd, { timeout: 7000 })
      console.log('stdout:', res.stdout)
    }
  } catch(e) { console.error('ERR', e, e.stack) }
})()
