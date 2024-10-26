export const OPERATOR_CREATOR = 0;
export const OPERATOR_MODIFIER = 1;
export const OPERATOR_QUERIER = 2;
export const OPERATOR_CLEANER = 3;

export const MOTION_TYPE_STATIC = 0;
export const MOTION_TYPE_DYNAMIC = 1;
export const MOTION_TYPE_KINEMATIC = 2;

export const MOTION_QUALITY_DISCRETE = 0;
export const MOTION_QUALITY_LINEAR_CAST = 1;

export const DOF_TRANSLATION_X = 1;
export const DOF_TRANSLATION_Y = 2;
export const DOF_TRANSLATION_Z = 4;
export const DOF_ROTATION_X = 8;
export const DOF_ROTATION_Y = 16;
export const DOF_ROTATION_Z = 32;
export const DOF_ALL = 63;

export const ISOMETRY_DEFAULT = 0;
export const ISOMETRY_FRONT_TO_BACK = 1;
export const ISOMETRY_BACK_TO_FRONT = 2;
export const ISOMETRY_NONE = 3;

export const OMP_CALCULATE_MASS_AND_INERTIA = 0;
export const OMP_CALCULATE_INERTIA = 1;
export const OMP_MASS_AND_INERTIA_PROVIDED = 2;

export const BFM_IGNORE_BACK_FACES = 0;
export const BFM_COLLIDE_BACK_FACES = 1;

export const GROUND_STATE_ON_GROUND = 0;
export const GROUND_STATE_ON_STEEP_GROUND = 1;
export const GROUND_STATE_NOT_SUPPORTED = 2;
export const GROUND_STATE_IN_AIR = 3;

export const CONSTRAINT_TYPE_UNDEFINED = -1;
export const CONSTRAINT_TYPE_FIXED = 0;
export const CONSTRAINT_TYPE_POINT = 1;
export const CONSTRAINT_TYPE_DISTANCE = 2;
export const CONSTRAINT_TYPE_HINGE = 3;
export const CONSTRAINT_TYPE_SLIDER = 4;
export const CONSTRAINT_TYPE_CONE = 5;
export const CONSTRAINT_TYPE_SWING_TWIST = 6;
export const CONSTRAINT_TYPE_SIX_DOF = 7;
export const CONSTRAINT_TYPE_PULLEY = 8;
export const CONSTRAINT_TYPE_VEHICLE_WHEEL = 9;
export const CONSTRAINT_TYPE_VEHICLE_TRACK = 10;
export const CONSTRAINT_TYPE_VEHICLE_MOTO = 11;

export const CONSTRAINT_SIX_DOF_TRANSLATION_X = 0;
export const CONSTRAINT_SIX_DOF_TRANSLATION_Y = 1;
export const CONSTRAINT_SIX_DOF_TRANSLATION_Z = 2;
export const CONSTRAINT_SIX_DOF_ROTATION_X = 3;
export const CONSTRAINT_SIX_DOF_ROTATION_Y = 4;
export const CONSTRAINT_SIX_DOF_ROTATION_Z = 5;

export const CONSTRAINT_SWING_TYPE_CONE = 0;
export const CONSTRAINT_SWING_TYPE_PYRAMID = 1;

export const CONSTRAINT_SPACE_LOCAL = 0;
export const CONSTRAINT_SPACE_WORLD = 1;

export const SPRING_MODE_FREQUENCY = 0;
export const SPRING_MODE_STIFFNESS = 1;

export const MOTOR_STATE_OFF = 0;
export const MOTOR_STATE_VELOCITY = 1;
export const MOTOR_STATE_POSITION = 2;

export const VEHICLE_CAST_TYPE_RAY = 0;
export const VEHICLE_CAST_TYPE_SPHERE = 1;
export const VEHICLE_CAST_TYPE_CYLINDER = 2;

export const TRANSMISSION_AUTO = 0;
export const TRANSMISSION_MANUAL = 1;

export const WHEEL_UNDEFINED = -1;
export const WHEEL_WHEELED = 0;
export const WHEEL_TRACKED = 1;

export const OBJ_LAYER_NON_MOVING = 0;
export const OBJ_LAYER_MOVING = 1;

export const BP_LAYER_NON_MOVING = 0;
export const BP_LAYER_MOVING = 1;

export const SHAPE_BOX = 0;
export const SHAPE_CAPSULE = 1;
export const SHAPE_CYLINDER = 2;
export const SHAPE_SPHERE = 3;
export const SHAPE_MESH = 4;
export const SHAPE_CONVEX_HULL = 5;
export const SHAPE_HEIGHTFIELD = 6;
export const SHAPE_STATIC_COMPOUND = 7;
export const SHAPE_MUTABLE_COMPOUND = 8;
export const SHAPE_PLANE = 9;
export const SHAPE_EMPTY = 10;
export const SHAPE_TAPERED_CAPSULE = 11;
export const SHAPE_TAPERED_CYLINDER = 12;

export const CONTACT_TYPE_ADDED = 0;
export const CONTACT_TYPE_PERSISTED = 1;
export const CONTACT_TYPE_REMOVED = 2;

export const COMPONENT_SYSTEM_MANAGER = 0;
export const COMPONENT_SYSTEM_BODY = 1;
export const COMPONENT_SYSTEM_CHAR = 2;
export const COMPONENT_SYSTEM_SOFT_BODY = 3;
export const COMPONENT_SYSTEM_CONSTRAINT = 4;

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

export const CMD_CREATE_BODY = 0;
export const CMD_CREATE_CHAR = 1;
export const CMD_CREATE_SHAPE = 2;
export const CMD_CREATE_VEHICLE = 3;
export const CMD_CREATE_SOFT_BODY = 4;

export const CMD_CAST_RAY = 5;
export const CMD_CAST_SHAPE = 6;

export const CMD_TOGGLE_GROUP_PAIR = 7;
export const CMD_CREATE_GROUPS = 8;
export const CMD_CREATE_CONSTRAINT = 9;
export const CMD_CHANGE_GRAVITY = 10;
export const CMD_USE_MOTION_STATE = 11;

export const CMD_ADD_FORCE = 12;
export const CMD_ADD_IMPULSE = 13;
export const CMD_APPLY_BUOYANCY_IMPULSE = 14;
export const CMD_ADD_ANGULAR_IMPULSE = 15;
export const CMD_ADD_TORQUE = 16;
export const CMD_MOVE_BODY = 17;
export const CMD_MOVE_KINEMATIC = 18;
export const CMD_SET_LIN_VEL = 19;
export const CMD_SET_ANG_VEL = 20;
export const CMD_SET_MOTION_TYPE = 21;
export const CMD_RESET_MOTION = 22;

export const CMD_SET_DRIVER_INPUT = 27;

export const CMD_DESTROY_BODY = 28;
export const CMD_DESTROY_SHAPE = 29;
export const CMD_DESTROY_CONSTRAINT = 30;

export const CMD_REPORT_TRANSFORMS = 31;
export const CMD_REPORT_CONTACTS = 32;
export const CMD_REPORT_SET_SHAPE = 33;

export const CMD_SET_OBJ_LAYER = 34;
export const CMD_SET_GRAVITY_FACTOR = 35;
export const CMD_SET_DOF = 36;

export const CMD_COLLIDE_POINT = 37;
export const CMD_COLLIDE_SHAPE_IDX = 38;

export const CMD_SET_MOTION_QUALITY = 39;
export const CMD_SET_AUTO_UPDATE_ISOMETRY = 40;
export const CMD_SET_ALLOW_SLEEPING = 41;
export const CMD_SET_ANG_FACTOR = 42;
export const CMD_SET_COL_GROUP = 43;
export const CMD_SET_FRICTION = 44;
export const CMD_SET_IS_SENSOR = 45;
export const CMD_SET_RESTITUTION = 46;
export const CMD_SET_KIN_COL_NON_DYN = 47;
export const CMD_SET_APPLY_GYRO_FORCE = 48;
export const CMD_SET_INTERNAL_EDGE = 49;
export const CMD_RESET_SLEEP_TIMER = 50;
export const CMD_SET_LIN_VEL_CLAMPED = 51;
export const CMD_SET_ANG_VEL_CLAMPED = 52;
export const CMD_SET_MAX_ANG_VEL = 53;
export const CMD_SET_MAX_LIN_VEL = 54;
export const CMD_CLAMP_LIN_VEL = 55;
export const CMD_CLAMP_ANG_VEL = 56;
export const CMD_SET_VEL_STEPS = 57;
export const CMD_SET_POS_STEPS = 58;
export const CMD_SET_SHAPE = 59;
export const CMD_SET_DEBUG_DRAW = 60;
export const CMD_SET_DEBUG_DRAW_DEPTH = 61;
export const CMD_ADD_SHAPE = 62;
export const CMD_REMOVE_SHAPE = 63;
export const CMD_MODIFY_SHAPE = 64;
export const CMD_UPDATE_BIT_FILTER = 65;


// Char Virtual 400-499
export const CMD_CHAR_PAIR_BODY = 400;
export const CMD_CHAR_SET_POS_ROT = 401;
export const CMD_CHAR_SET_MASS = 402;
export const CMD_CHAR_SET_MAX_STR = 403;
export const CMD_CHAR_SET_LIN_VEL = 404;
export const CMD_CHAR_SET_SHAPE = 405;
export const CMD_CHAR_SET_REC_SPD = 406;
export const CMD_CHAR_SET_NUM_HITS = 407;
export const CMD_CHAR_SET_HIT_RED_ANGLE = 408;
export const CMD_CHAR_SET_SHAPE_OFFSET = 409;
export const CMD_CHAR_SET_USER_DATA = 410;
export const CMD_CHAR_SET_UP = 411;
export const CMD_CHAR_SET_BP_FILTER_LAYER = 412;
export const CMD_CHAR_SET_OBJ_FILTER_LAYER = 413;
export const CMD_CHAR_SET_COS_ANGLE = 414;
export const CMD_CHAR_SET_MIN_DIST = 415;
export const CMD_CHAR_SET_TEST_DIST = 416;
export const CMD_CHAR_SET_EXTRA_DOWN = 417;
export const CMD_CHAR_SET_STEP_UP = 418;
export const CMD_CHAR_SET_STICK_DOWN = 419;
export const CMD_CHAR_UPDATE_BIT_FILTER = 420;

// Constraints 500-599

export const CMD_JNT_SET_ENABLED = 500;

export const CMD_JNT_ST_SET_N_H_C_ANGLE = 510;
export const CMD_JNT_ST_SET_P_H_C_ANGLE = 511;
export const CMD_JNT_ST_SET_T_MIN_ANGLE = 512;
export const CMD_JNT_ST_SET_T_MAX_ANGLE = 513;
export const CMD_JNT_ST_SET_M_F_TORQUE = 514;
export const CMD_JNT_ST_SET_SWING_M_S = 515;
export const CMD_JNT_ST_SET_TWIST_M_S = 516;
export const CMD_JNT_ST_SET_T_ANG_VEL_CS = 517;
export const CMD_JNT_ST_SET_T_O_BS = 518;
export const CMD_JNT_ST_SET_T_O_CS = 519;

export const CMD_JNT_D_SET_DISTANCE = 520;
export const CMD_JNT_D_SET_SPRING_S = 521;

export const CMD_JNT_H_SET_SPRING_S = 530;
export const CMD_JNT_H_SET_M_F_TORQUE = 531;
export const CMD_JNT_H_SET_M_S = 532;
export const CMD_JNT_H_SET_T_ANG_VEL = 533;
export const CMD_JNT_H_SET_T_ANGLE = 534;
export const CMD_JNT_H_SET_LIMITS = 535;

export const CMD_JNT_S_SET_M_F_FORCE = 550;
export const CMD_JNT_S_SET_M_STATE = 551;
export const CMD_JNT_S_SET_T_VEL = 552;
export const CMD_JNT_S_SET_T_POS = 553;
export const CMD_JNT_S_SET_LIMITS = 554;
export const CMD_JNT_S_SET_SPRING_S = 555;

export const CMD_JNT_C_SET_H_C_ANGLE = 560;

export const CMD_JNT_SDF_SET_T_LIMITS = 570;
export const CMD_JNT_SDF_SET_R_LIMITS = 571;
export const CMD_JNT_SDF_SET_SPRING_S = 572;
export const CMD_JNT_SDF_SET_M_F = 573;
export const CMD_JNT_SDF_SET_M_STATE = 574;
export const CMD_JNT_SDF_SET_T_VEL_CS = 575;
export const CMD_JNT_SDF_SET_T_ANG_VEL_CS = 576;
export const CMD_JNT_SDF_SET_T_POS_CS = 577;
export const CMD_JNT_SDF_SET_T_ROT_CS = 578;
export const CMD_JNT_SDF_SET_T_ROT_BS = 579;

export const CMD_VEHICLE_SET_INPUT = 580;
