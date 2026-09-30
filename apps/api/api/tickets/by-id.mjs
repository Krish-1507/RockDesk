/** Thin function wrapper: Express routes internally. */
import app from '../../dist/src/index.js';

export default function handler(req, res) {
  app(req, res);
}
