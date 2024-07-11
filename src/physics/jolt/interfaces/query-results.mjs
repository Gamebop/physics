/**
 * @import {CastResult} from "../front/response-handler.mjs"
 */

/**
 * @interface
 * @param {CastResult[]} results - An array with query results. An empty array if no
 * results.
 */
function CastShapeCallback(results) {}

export { CastShapeCallback, CastResult };
