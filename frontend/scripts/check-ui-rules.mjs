import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export function checkUI(source, filename = 'component.tsx') {
  const ast = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const issues = []
  function report(node, rule) { issues.push(`${filename}:${ast.getLineAndCharacterOfPosition(node.getStart(ast)).line + 1}: ${rule}`) }
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(ast) === 'className' && node.initializer) {
      const value = node.initializer.getText(ast)
      const tag = node.parent.parent.tagName?.getText(ast)
      if (/\b(?:bg-gradient-to-|bg-linear-|bg-clip-text)/.test(value)) report(node, 'Không dùng gradient')
      if (/\b(?:hover:scale-|group-hover:scale-)/.test(value)) report(node, 'Không zoom khi hover')
      if (tag === 'button' && /\b(?:hover:)?shadow-(?!none\b|0\b)/.test(value)) report(node, 'Button phải phẳng, không shadow')
      if (/\buppercase\b/.test(value) && !/(?:AppLogo|UserAvatar)\.tsx$/.test(filename)) report(node, 'Dùng sentence case')
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return issues
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
  const issues = []
  function walk(dir) { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (/\.tsx$/.test(file)) issues.push(...checkUI(fs.readFileSync(file, 'utf8'), path.relative(root, file)))
  } }
  walk(root)
  if (issues.length) { console.error(issues.join('\n')); process.exitCode = 1 }
  else console.log('UI: đạt các kiểm tra AST về gradient, hover zoom, shadow button và sentence case. Layout, contrast và responsive cần kiểm tra trên trình duyệt.')
}
