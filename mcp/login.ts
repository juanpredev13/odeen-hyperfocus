import { createInterface } from 'node:readline'
import { Writable } from 'node:stream'
import { supabaseUrl } from './env'
import { SESSION_FILE } from './services/sessionStorage'
import { supabase } from './services/supabase'

let muted = false

// readline echoes what is typed through its output stream; muting it hides the password.
const output = new Writable({
  write(chunk: Buffer, _encoding, done) {
    if (!muted) process.stdout.write(chunk)
    done()
  },
})

const prompt = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY })
// Reading through the iterator (not `question`) also works when the answers are piped in.
const lines = prompt[Symbol.asyncIterator]()

async function ask(question: string, hidden = false): Promise<string> {
  process.stdout.write(question)
  muted = hidden
  const answer = await lines.next()
  muted = false
  if (hidden) process.stdout.write('\n')
  if (answer.done) throw new Error('No input.')
  return answer.value
}

async function login(): Promise<number> {
  console.log(`Signing in to ODEEN at ${supabaseUrl}`)
  const email = (await ask('Email: ')).trim()
  const password = await ask('Password: ', true)

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.error(`Sign-in failed: ${error.message}`)
    return 1
  }

  console.log(`Signed in as ${email}. Session stored in ${SESSION_FILE}`)
  return 0
}

async function logout(): Promise<number> {
  // Local scope: ends this session only, the web and desktop apps stay signed in.
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) {
    console.error(`Sign-out failed: ${error.message}`)
    return 1
  }

  console.log('Signed out of the ODEEN MCP server.')
  return 0
}

const code = process.argv[2] === 'logout' ? await logout() : await login()
prompt.close()
process.exit(code)
