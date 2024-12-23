/**
 * @import { CastResult, CollideShapeResult } from "../front/response-handler.mjs"
 * @import { Entity } from "playcanvas"
 */

/**
 * @interface
 * @param {CastResult[]} results - An array with query results. An empty array if no
 * results.
 */
function CastCallback(results) {}

/**
 * @interface
 * @param {Entity[]} results - An array of entities that the point collided with. Array will be
 * empty, if no entities collided.
 */
function CollidePointCallback(results) {}

/**
 * @interface
 * @param {CollideShapeResult[]} results - An array with query results. An empty array if no
 * results.
 */
function CollideShapeCallback(results) {}

/**
 * @interface
 * @param {boolean} wasSet - Boolean, whether the shape was successfully changed or not. If there
 * is not enough physical space to create the shape, the shape change will fail and this will be
 * `false`.
 */
function CharSetShapeCallback(wasSet) {}

export { CastCallback, CharSetShapeCallback, CollidePointCallback, CollideShapeCallback };
