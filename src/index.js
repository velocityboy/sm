/**
 * @flow
 */
import yargs from 'yargs';

import SourceMap from './SourceMap';

for (const filename of yargs.argv._) {
  try {
    const dumper = new SourceMap(filename);
    dumper.dump();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
  }
}
