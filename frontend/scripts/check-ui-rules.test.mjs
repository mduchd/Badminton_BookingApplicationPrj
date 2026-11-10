import test from 'node:test'
import assert from 'node:assert/strict'
import { checkUI } from './check-ui-rules.mjs'
test('detects multiline and conditional button shadows', () => {
  assert.equal(checkUI('<button\n className={active ? "shadow-xs" : "shadow-none"}>OK</button>').length, 1)
})
test('does not confuse dialog shadow with button shadow or comments', () => {
  assert.deepEqual(checkUI('{/* hover:scale-105 */}<div className="shadow-xl"><button className="shadow-none">OK</button></div>'), [])
})
test('detects uppercase and hover zoom; allows brand wordmarks', () => {
  assert.equal(checkUI('<h2 className="uppercase hover:scale-105">Title</h2>').length, 2)
  assert.deepEqual(checkUI('<span className="uppercase">SmashCourt</span>', 'AppLogo.tsx'), [])
})
