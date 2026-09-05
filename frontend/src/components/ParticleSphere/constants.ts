export const PARTICLE_COUNT = 300;
export const PARTICLE_COUNT_MOBILE = 160;
export const CLUSTER_RADIUS = 1.42;
export const SPHERE_OFFSET: [number, number, number] = [1.85, 0.04, 0];

/** Packed berries stay a fixed size; cursor displaces them, it does not inflate them. */
export const SCALE_IDLE = 1;
export const INSTANCE_PACK = 0.42;

/** Cursor trail: slide on the sphere surface (not scale-up). */
export const DISPLACE_SWIRL = 0.18;
export const DISPLACE_PULL = 0.12;
export const RADIAL_POP = 0.14;

/** Whole cluster Y-spin, radians per second. */
export const SPIN_SPEED = 0.09;

export const COLOR_IDLE = "#04140F";
export const COLOR_ACTIVE_TEAL = "#10CD98";
export const COLOR_ACTIVE_LIME = "#93FF0C";
export const COLOR_WHITE = "#FFFFFF";
export const COLOR_TYPING_WARM = "#F6E9A8";
export const COLOR_YELLOW = "#FFE14A";
export const YELLOW_BERRY_FRACTION = 0.12;

export const FRESNEL_RIM: [number, number, number] = [0.06, 0.42, 0.38];
export const FRESNEL_STRENGTH = 0.32;

export const NOISE_SPEED_IDLE = 1;
export const NOISE_SPEED_FOCUS = 1.22;
export const THRESH_LOW = 0.42;
export const THRESH_HIGH = 0.78;
export const SURGE_DEPTH = 0.16;

export const WAVE_TRAVEL = 0.38;
export const WAVE_AXIS_SPEED = 0.16;
export const WAVE_WIDTH = 1.15;

/** Brief on-sphere hemisphere beat — color/density only, shape stays a sphere. */
export const HEMI_BEAT_DURATION = 1;
export const HEMI_BEAT_GAP = 5.5;
export const HEMI_AIRY_SCALE = 0.58;
export const HEMI_THIN_FRACTION = 0.28;

/** Quiet after assembly, then a brief ignition flash. */
export const ENTRANCE_QUIET = 4;
export const ENTRANCE_FLASH = 0.85;
export const ENTRANCE_QUIET_AMP = 0.12;

export const ASSEMBLY_DURATION = 2.9;
export const ASSEMBLY_SCATTER = 2.2;

export const POINTER_FALLOFF_FACTOR = 0.5;
export const POINTER_CORE_FACTOR = 0.18;
export const POINTER_STEPS = 8;
export const POINTER_FRONT_DOT = 0.12;
export const ENERGY_DECAY = 0.972;

export const SPARK_POOL = 100;
export const SPARK_ENERGY_THRESHOLD = 0.72;
export const SPARK_SPAWN_CHANCE = 0.18;
export const SPARK_LIFE_MIN = 0.28;
export const SPARK_LIFE_MAX = 0.55;
export const SPARK_SPEED_MIN = 0.18;
export const SPARK_SPEED_MAX = 0.42;
export const SPARK_JITTER = 0.12;
export const SPARK_DRAG = 0.96;

export const ESCAPE_MIN = 4;
export const ESCAPE_MAX = 7;
export const ESCAPE_DURATION = 1.5;

export const SUCCESS_PASS = 1.1;

/** Typing as a signal ping: a patch fully ignites, dynamics surge with each key. */
export const TYPING_GLOW_PEAK = 0.9;
export const TYPING_GLOW_DECAY = 0.88;
export const TYPING_CONTRACT = 0.06;
export const TYPING_FOCUS_HOLD = 0.1;
export const TYPING_INNER_LIGHT = 4.2;
export const TYPING_BLINK_FRACTION = 0.34;
export const TYPING_SIGNAL_WIDTH = 0.7;
export const TYPING_SIGNAL_SPEED = 3.6;
export const TYPING_SPIN_BOOST = 1.15;
export const TYPING_WAVE_BOOST = 1.45;
export const TYPING_SPARK_BURST = 14;
export const TYPING_ESCAPE_CHANCE = 0.38;

/** Cursor-hot berries sometimes flicker off, then return — sphere silhouette stays. */
export const VANISH_ENERGY = 0.58;
export const VANISH_CHANCE = 0.16;

export const BLOOM_THRESHOLD = 0.2;
export const BLOOM_SMOOTHING = 0.9;
export const BLOOM_INTENSITY = 1.05;

export const AMBIENT_DRIFT_COUNT = 140;
