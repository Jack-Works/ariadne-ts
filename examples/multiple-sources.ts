import { Label, Range, Report, sources } from '@magic-works/ariadne'

const mainSourceId = 'src/main.ts'
const configSourceId = 'src/config.ts'
const mainSource = `import { port } from './config.js'
startServer(port)`
const configSource = `export const port: string = "3000"`
const portUse = mainSource.lastIndexOf('port')
const portDeclaration = configSource.indexOf('port:')

const output = Report.build(mainSourceId, portUse)
  .with_message('The server port must be a number')
  .with_label(
    Label.from({
      sourceId: mainSourceId,
      range: Range.new(portUse, portUse + 'port'.length),
    }).with_message('A number is required here'),
  )
  .with_label(
    Label.from({
      sourceId: configSourceId,
      range: Range.new(
        portDeclaration,
        portDeclaration + 'port: string'.length,
      ),
    }).with_message('This declaration provides a string'),
  )
  .finish()
  .render(
    sources([
      { sourceId: mainSourceId, source: mainSource },
      { sourceId: configSourceId, source: configSource },
    ]),
    'ansi',
    { maxWidth: 100 },
  )

declare const console: { log(value: string): void }
console.log(output)
