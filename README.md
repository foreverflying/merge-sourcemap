# join-source-map
[![join-source-map npm version](https://img.shields.io/npm/v/join-source-map.svg?style=popout&color=blue&label=join-source-map)](https://www.npmjs.com/package/join-source-map)

 Merge the SourceMap files generated in several steps, and overwrite the last one with the merged one.

## What problems do I aim to solve?
We usually process the TypeScript code with many tools in pipelines, many of them may generate SourceMap files for debugging use, but these SourceMap files are mapped to the files generated in the previous step, not the original one. Several npm packages are aiming to solve this problem, as I tried, the best working one is [multi-stage-sourcemap](https://github.com/azu/multi-stage-sourcemap), however, it just processes only two SourceMap files each time, you need to figure out which two - not very friendly for batch processing, another problem is it does not support the "bundled" SourceMap, which means it has more than one sources. The join-source-map is designed to batch process all the SourceMap files in a folder in a very efficient way, it automatically traces up through the SourceMap chain collecting information, but only overwrites the very last one. Also, it supports the bundled SourceMap files.

## Install
install as a dev dependency and run with `npx join-source-map`
```sh
npm install --save-dev join-source-map
```
or install it globally and run with command `join-source-map`
```sh
npm install -g join-source-map
```

## Important:

* Make sure all the generated files with SourceMaps have a link line (//# sourceMappingURL=xxx.map) pointing to the relevant .map file. The mergeSourceMap feature depends on it to trace up the SouceMap chains.

* Currently join-source-map does not support inline SourceMaps.

# Command line usage
To show the usage: `npx join-source-map -h`
```
Usage: join-source-map [options] <out-dir> <file-exts...>

Merge all the relevent SourceMap files of files with specific extentions in a folder.

Arguments:
  out-dir         the output folder path
  file-exts       the file extentions, like .js or .d.ts, also
                  accept .map

Options:
  -r --recursive  loop through all sub directories
  -h, --help      display help for command
```

# Thanks to
[source-map](https://github.com/mozilla/source-map)

[multi-stage-sourcemap](https://github.com/azu/multi-stage-sourcemap)
