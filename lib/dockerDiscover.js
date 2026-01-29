const { promisify } = require('util')
const { exec } = require('child_process')
const execP = promisify(exec)

async function discoverContainer(searchTerm = 'vision|ranitas') {
  const listCmd = 'docker ps --format "{{.ID}} {{.Names}} {{.Image}} {{.Status}}"'
  try {
    const psList = await execP(listCmd, { timeout: 3000 })
    // Normalizar salida: promisified exec puede devolver { stdout, stderr } o directamente stdout en algunos mocks
    const raw = (psList && (typeof psList === 'object' ? (psList.stdout ?? psList) : psList)) || ''
    const rows = String(raw).split(/\n/).map(s => s.trim()).filter(Boolean)
    const terms = (searchTerm || 'vision|ranitas').toLowerCase().split('|').map(s => s.trim()).filter(Boolean)

    for (const row of rows) {
      const parts = row.split(/\s+/)
      const id = parts[0]
      const name = parts[1] || null
      const image = parts[2] || ''
      const combined = `${name || ''} ${image}`.toLowerCase()
      for (const t of terms) {
        if (combined.includes(t)) return { candidate: name || id, ps_raw: raw, cmd: listCmd }
      }
    }

    if (rows.length > 0) {
      const firstName = rows[0].split(/\s+/)[1]
      return { candidate: firstName || null, ps_raw: raw, cmd: listCmd }
    }

    return { candidate: null, ps_raw: raw, cmd: listCmd }
  } catch (err) {
    return { candidate: null, ps_raw: null, cmd: listCmd, error: String(err) }
  }
}

module.exports = { discoverContainer }
