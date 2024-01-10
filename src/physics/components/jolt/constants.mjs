export const OPERATOR_CREATOR = 0;
export const OPERATOR_MODIFIER = 1;
export const OPERATOR_QUERIER = 2;
export const OPERATOR_CLEANER = 3;

export const CONSTRAINT_TYPE_FIXED = 0;
export const CONSTRAINT_TYPE_POINT = 1;
export const CONSTRAINT_TYPE_DISTANCE = 2;
export const CONSTRAINT_TYPE_HINGE = 3;
export const CONSTRAINT_TYPE_SLIDER = 4;
export const CONSTRAINT_TYPE_CONE = 5;
export const CONSTRAINT_TYPE_SWING_TWIST = 6;
export const CONSTRAINT_TYPE_SIX_DOF = 7;

export const CONSTRAINT_SIX_DOF_TRANSLATION_X = 0;
export const CONSTRAINT_SIX_DOF_TRANSLATION_Y = 1;
export const CONSTRAINT_SIX_DOF_TRANSLATION_Z = 2;
export const CONSTRAINT_SIX_DOF_ROTATION_X = 3;
export const CONSTRAINT_SIX_DOF_ROTATION_Y = 4;
export const CONSTRAINT_SIX_DOF_ROTATION_Z = 5;

export const CONSTRAINT_SPACE_LOCAL = 0;
export const CONSTRAINT_SPACE_WORLD = 1;

export const SPRING_MODE_FREQUENCY = 0;
export const SPRING_MODE_STIFFNESS = 1;

export const VEHICLE_CAST_TYPE_RAY = 0;
export const VEHICLE_CAST_TYPE_SPHERE = 1;
export const VEHICLE_CAST_TYPE_CYLINDER = 2;

export const OBJECT_LAYER_NON_MOVING = 0;
export const OBJECT_LAYER_MOVING = 1;

export const SHAPE_BOX = 0;
export const SHAPE_CAPSULE = 1;
export const SHAPE_CYLINDER = 2;
export const SHAPE_SPHERE = 3;
export const SHAPE_MESH = 4;
export const SHAPE_CONVEX_HULL = 5;
export const SHAPE_STATIC_COMPOUND = 6;
export const SHAPE_HEIGHTFIELD = 7;

export const VEHICLE_TYPE_WHEEL = 0;
export const VEHICLE_TYPE_TRACK = 1;
export const VEHICLE_TYPE_MOTORCYCLE = 2;

export const CONTACT_TYPE_ADDED = 0;
export const CONTACT_TYPE_PERSISTED = 1;
export const CONTACT_TYPE_REMOVED = 2;

export const COMPONENT_SYSTEM_BODY = 0;
export const COMPONENT_SYSTEM_CHAR = 1;
export const COMPONENT_SYSTEM_VEHICLE = 2;
export const COMPONENT_SYSTEM_SOFT_BODY = 3;

export const FLOAT32_SIZE = Float32Array.BYTES_PER_ELEMENT;
export const INT32_SIZE = Int32Array.BYTES_PER_ELEMENT;
export const UINT32_SIZE = Uint32Array.BYTES_PER_ELEMENT;
export const UINT16_SIZE = Uint16Array.BYTES_PER_ELEMENT;
export const UINT8_SIZE = Uint8Array.BYTES_PER_ELEMENT;

export const BUFFER_WRITE_UINT8 = 'writeUint8';
export const BUFFER_WRITE_UINT16 = 'writeUint16';
export const BUFFER_WRITE_UINT32 = 'writeUint32';
export const BUFFER_WRITE_INT32 = 'writeInt32';
export const BUFFER_WRITE_VEC32 = 'writeVector32';
export const BUFFER_WRITE_FLOAT32 = 'writeFloat32';
export const BUFFER_WRITE_BOOL = 'writeBool';
export const BUFFER_WRITE_PLANE = 'writePlane';
export const BUFFER_WRITE_JOLTVEC32 = 'writeJoltVec32';

export const BUFFER_READ_UINT8 = 'readUint8';
export const BUFFER_READ_UINT16 = 'readUint16';
export const BUFFER_READ_UINT32 = 'readUint32';
export const BUFFER_READ_INT32 = 'readInt32';
export const BUFFER_READ_FLOAT32 = 'readFloat32';
export const BUFFER_READ_BOOL = 'readBool';


let i = 0;
// frontend -> backend
export const CMD_CREATE_BODY = i++;
export const CMD_CREATE_CHAR = i++;
export const CMD_CREATE_SHAPE = i++;
export const CMD_CREATE_VEHICLE = i++;
export const CMD_CREATE_SOFT_BODY = i++;
export const CMD_ADD_FORCE = i++;
export const CMD_ADD_IMPULSE = i++;
export const CMD_APPLY_BUOYANCY_IMPULSE = i++;
export const CMD_ADD_ANGULAR_IMPULSE = i++;
export const CMD_ADD_TORQUE = i++;
export const CMD_CAST_RAY = i++;
export const CMD_CAST_SHAPE = i++;
export const CMD_DESTROY_BODY = i++;
export const CMD_DESTROY_SHAPE = i++;
export const CMD_MOVE_BODY = i++;
export const CMD_SET_LIN_VEL = i++;
export const CMD_SET_ANG_VEL = i++;
export const CMD_SET_MOTION_TYPE = i++;
export const CMD_RESET_VELOCITIES = i++;
export const CMD_TOGGLE_GROUP_PAIR = i++;
export const CMD_CREATE_GROUPS = i++;
export const CMD_CREATE_CONSTRAINT = i++;
export const CMD_CHANGE_GRAVITY = i++;
export const CMD_CHAR_SET_LIN_VEL = i++;
export const CMD_CHAR_SET_SHAPE = i++;
export const CMD_SET_USER_DATA = i++;
export const CMD_USE_MOTION_STATE = i++;
export const CMD_SET_CONSTRAINT_ENABLED = i++;
export const CMD_DESTROY_CONSTRAINT = i++;
export const CMD_SET_DRIVER_INPUT = i++;
// backend -> frontend
export const CMD_UPDATE_TRANSFORMS = i++;
export const CMD_REPORT_CONTACTS = i++;
export const CMD_REPORT_SET_SHAPE = i++;
