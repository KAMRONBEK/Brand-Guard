type MotionEase = [number, number, number, number];

export type VariantsType = {
	durationIn?: number;
	durationOut?: number;
	easeIn?: MotionEase;
	easeOut?: MotionEase;
	distance?: number;
};

export type TranHoverType = {
	duration?: number;
	ease?: MotionEase;
};
export type TranEnterType = {
	durationIn?: number;
	easeIn?: MotionEase;
};
export type TranExitType = {
	durationOut?: number;
	easeOut?: MotionEase;
};

export type BackgroundType = {
	duration?: number;
	ease?: MotionEase;
	colors?: string[];
};
