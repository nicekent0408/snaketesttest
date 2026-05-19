/**
 * 遊戲常數與型別定義
 */

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 20;

export type Point = {
  x: number;
  y: number;
};

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

export const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];

export const INITIAL_DIRECTION = Direction.UP;
export const INITIAL_SPEED = 120; // 毫秒
export const SPEED_INCREMENT = 2; // 吃到食物後縮短的毫秒數
export const MIN_SPEED = 60;
