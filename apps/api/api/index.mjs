/**
 * Production serverless entry. Runs from source with ../dist built by the
 * project buildCommand. Pure request handler — never listen here.
 */
import app from "../dist/src/index.js";

export default function handler(req, res) {
  app(req, res);
}
