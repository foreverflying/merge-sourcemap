/* eslint-disable @typescript-eslint/no-non-null-assertion */
import fs from 'fs'
import path from 'path'
import { Position, RawSourceMap, SourceMapConsumer, SourceMapGenerator } from 'source-map'

type SourceMapNode = {
    filePath: string
    original: RawSourceMap
    resolved: RawSourceMap
    consumer: SourceMapConsumer
    isWritten?: boolean
}

const sourceMapLinkReg = /^\/\/# sourceMappingURL=(.+\.map)$/m

export class SourceMapMerger {
    constructor() {
        this._sourceMapTable = new Map<string, SourceMapNode>()
    }

    async merge(rootPath: string, fileExtArr: string[], recursive = false) {
        await this.enumerateAllFiles(rootPath, fileExtArr, recursive, async (fileName: string) => {
            const sourceMapNode = await this.findAndResolveSourceMapFromFile(fileName)
            if (!sourceMapNode || sourceMapNode.isWritten) {
                return
            }
            if (sourceMapNode.resolved !== sourceMapNode.original) {
                fs.writeFileSync(sourceMapNode.filePath, JSON.stringify(sourceMapNode.resolved))
                sourceMapNode.isWritten = true
            }
        })
        for (const { filePath, consumer } of this._sourceMapTable.values()) {
            if (filePath.endsWith('.map')) {
                consumer.destroy()
            }
        }
        this._sourceMapTable.clear()
    }

    private async enumerateAllFiles(
        rootPath: string,
        fileExtArr: string[],
        recursive: boolean,
        cb: (fileName: string) => Promise<void>,
    ) {
        const ents = fs.readdirSync(rootPath, { withFileTypes: true })
        for (const ent of ents) {
            if (ent.isFile() && this.fileNameHasExt(ent.name, fileExtArr)) {
                await cb(path.join(rootPath, ent.name))
            } else if (recursive && ent.isDirectory()) {
                this.enumerateAllFiles(path.join(rootPath, ent.name), fileExtArr, recursive, cb)
            }
        }
    }

    private fileNameHasExt(fileName: string, fileExtArr: string[]) {
        for (const ext of fileExtArr) {
            if (fileName.endsWith(ext)) {
                return true
            }
        }
        return false
    }

    private async findAndResolveSourceMapFromFile(file: string): Promise<SourceMapNode | undefined> {
        const { _sourceMapTable } = this
        let sourceMapNode = _sourceMapTable.get(file)
        if (sourceMapNode) {
            return sourceMapNode
        }
        const decoder = new TextDecoder()
        let buffer = fs.readFileSync(file)
        let content = decoder.decode(buffer)
        let sourceMapFilePath = file
        if (!file.endsWith('.map')) {
            const matchArr = content.match(sourceMapLinkReg)
            if (!matchArr) {
                return
            }
            const filePath = matchArr[1]
            const dirPath = path.dirname(file)
            sourceMapFilePath = path.isAbsolute(filePath) ? filePath : path.join(dirPath, filePath)
            sourceMapNode = _sourceMapTable.get(sourceMapFilePath)
            if (sourceMapNode) {
                _sourceMapTable.set(file, sourceMapNode)
                return sourceMapNode
            }
            buffer = fs.readFileSync(sourceMapFilePath)
            content = decoder.decode(buffer)
        }
        const original = JSON.parse(content) as RawSourceMap
        const resolved = await this.resolveSourceMap(original, sourceMapFilePath)
        const consumer = await new SourceMapConsumer(resolved)
        sourceMapNode = {
            filePath: sourceMapFilePath,
            original: original,
            resolved: resolved,
            consumer: consumer,
        }
        _sourceMapTable.set(file, sourceMapNode)
        _sourceMapTable.set(sourceMapFilePath, sourceMapNode)
        return sourceMapNode
    }

    private async resolveSourceMap(sourceMap: RawSourceMap, filePath: string): Promise<RawSourceMap> {
        let dirName = path.dirname(filePath)
        if (sourceMap.sourceRoot) {
            const rootPath = sourceMap.sourceRoot
            dirName = path.isAbsolute(rootPath) ? rootPath : path.join(dirName, rootPath)
        }
        const sourceFileNameMap = new Map<string, SourceMapNode>()
        for (const sourcePath of sourceMap.sources) {
            const absPath = path.isAbsolute(sourcePath) ? sourcePath : path.join(dirName, sourcePath)
            const prev = await this.findAndResolveSourceMapFromFile(absPath)
            if (prev) {
                sourceFileNameMap.set(sourcePath, prev)
            }
        }
        if (!sourceFileNameMap.size) {
            return sourceMap
        }
        const fromConsumer = await new SourceMapConsumer(sourceMap)
        const result = new SourceMapGenerator()
        fromConsumer.eachMapping(mapping => {
            const fromOriginalPos: Position = {
                line: mapping.originalLine,
                column: mapping.originalColumn,
            }
            const prevSourceMapNode = sourceFileNameMap.get(mapping.source)!
            const toConsumer = prevSourceMapNode.consumer
            const originalPos = toConsumer.originalPositionFor(fromOriginalPos)
            const originalSource = originalPos.source
            if (originalSource) {
                const generatedPos: Position = {
                    line: mapping.generatedLine,
                    column: mapping.generatedColumn,
                }
                result.addMapping({
                    source: originalSource,
                    name: originalPos.name || undefined,
                    generated: generatedPos,
                    original: {
                        line: originalPos.line!,
                        column: originalPos.column!,
                    },
                })
                const sourceContent = toConsumer.sourceContentFor(originalSource)!
                result.setSourceContent(originalSource, sourceContent)
            }
        })
        return result.toJSON() as RawSourceMap
    }

    private _sourceMapTable: Map<string, SourceMapNode>
}
