// @flow

import {toByteArray} from 'base64-js';
import fs from 'fs';
import invariant from 'assert';
import path from 'path';
import {TextDecoder} from 'text-encoding';
import decodeBase64VLQ from './Base64VLQ';

type SourceMappingData = {
  version: number,
  file?: string,
  sourceRoot?: string,
  sources: string[],
  sourcesContent?: string[],
  names: string[],
  mappings: string,
};

type Segment = {
  generatedFileLine: number;
  column: number,
  sources?: number,
  originalLine?: number,
  originalColumn?: number,
  namesIndex?: number
};

type GeneratedLineData = Segment[];

type MappingData = Map<number, GeneratedLineData>;

export default class SourceMap {
  _path: string;
  _data: SourceMappingData;
  _mapping: MappingData = new Map();

  constructor(path: string) {
    this._path = path;
  }

  dump(): void {
    this._data = this._getSourceMappingData();
    console.log(this._data);
    this._extractMappings();
    console.log(this._mapping);
  }

  _extractMappings() {
    const data =
      this._data.mappings.split(';').map((group, lineNo) => [
        lineNo,
        group.split(',').map(
          segment => this._mappingFromBase64(lineNo, segment)
        ).filter(x => x.generatedFileLine !== -1)
      ]).filter(x => x[1].length > 0);

      data.forEach(group => {
        group[1].forEach((segment, index) => {
          if (index > 0) {
            segment.column += group[1][index-1].column;
          }
        })
      });

      this._mapping = new Map(data);
  }

  _mappingFromBase64(lineNumber: number, base64: string): Segment {
    const segment = decodeBase64VLQ(base64);
    const [column, sources, originalLine, originalColumn, namesIndex] = segment;

    if (column == null) {
      return {generatedFileLine: -1, column: -1};
    }

    let mapping = this._mapping.get(lineNumber);
    if (mapping == null) {
      mapping = [];
      this._mapping.set(lineNumber, mapping);
    }

    return {
      generatedFileLine: lineNumber,
      column, sources, originalLine, originalColumn, namesIndex
    };
  }

  _getSourceMappingData(): SourceMappingData {
    const matches = this._readLastFewLines()
      .reverse()
      .map(_ => _.match(/^\/\/[#@]\s*sourceMappingURL=(.*)$/))
      .filter(_ => _ != null);

    const first = matches[0];
    if (first == null) {
      throw new Error(
        `${this._path} contains no source map data.\n`
      );
    }

    const [, url] = first;
    const protocol = this._urlProtocol(url);

    let data: string;
    if (protocol === 'data') {
      data = this._extractInlineSourceMap(url);
    } else {
      data = this._extractStandaloneSourceMap(url);
    }

    return JSON.parse(data);
  }

  _extractInlineSourceMap(url: string): string {
    const stripProtocol = url.match(/^[^:]+:(.*)$/);
    invariant(stripProtocol != null, 'should have protocol');
    const [, data] = stripProtocol;
    const pieces = data.split(/;/);
    let payload = pieces[pieces.length - 1]
    invariant(payload != null, 'could not get data');
    const match = payload.match(/.*,(.*)/);
    if (match) {
      [, payload] = match;
    }

    return new TextDecoder('utf-8').decode(toByteArray(payload));
  }

  _extractStandaloneSourceMap(url: string): string {
    const dir = path.dirname(this._path);
    const filename = path.join(dir, url);

    try {
      const fd = fs.openSync(filename, 'r');
      const data = fs.readFileSync(fd, 'utf8');
      fs.closeSync(fd);
      return data;
    } catch (error) {
      throw new Error(
        `Could not open paired source map for ${this._path}`
      );
    }
  }

  _urlProtocol(url: string): ?string {
    const match = url.match(/^([^:]+):/);
    if (match != null) {
      return match[1];
    }
    return null;
  }

  _readLastFewLines(): string[] {
    if (!fs.existsSync(this._path)) {
      throw new Error(`'${this._path}' does not exist.`);
    }

    const fd = fs.openSync(this._path, 'r');
    const data = fs.readFileSync(fd, 'utf8').split(/\n/).splice(-10);
    fs.closeSync(fd);
    return data;
  }
}
