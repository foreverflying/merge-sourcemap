import path from 'path'
import { program } from 'commander'
import { SourceMapMerger } from './index'

program
    .description('Merge all the relevent SourceMap files of files with specific extentions in a folder.')
    .argument('<out-dir>', 'the output folder path')
    .argument('<file-exts...>', 'the file extentions, like .js or .d.ts, also accept .map')
    .option('-r --recursive', 'loop through all sub directories')
    .action((outDir: string, fileExts: string[], options: Record<string, boolean>) => {
        outDir = path.isAbsolute(outDir) ? path.normalize(outDir) : path.join(process.cwd(), outDir)
        const merger = new SourceMapMerger()
        return merger.merge(outDir, fileExts, options.recursive)
    })

program.parse(process.argv)
