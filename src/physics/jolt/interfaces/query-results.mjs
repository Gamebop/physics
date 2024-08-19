/**
 * @import {CastResult} from "../front/response-handler.mjs"
 */

/**
 * @interface
 * @param {CastResult[]} results - An array with query results. An empty array if no
 * results.
 */
function CastShapeCallback(results) {}

/**
 * @interface
 * @param {boolean} canWalk - Boolean, telling if a character can walk the stairs.
 */
function CanWalkStairsCallback(canWalk) {}

/**
 * @interface
 * @param {boolean} wasSet - Boolean, whether the shape was successfully changed or not. If there
 * is not enough physical space to create the shape, the shape change will fail and this will be
 * `false`.
 */
function CharSetShapeCallback(wasSet) {}

export { CastShapeCallback, CanWalkStairsCallback, CharSetShapeCallback };
