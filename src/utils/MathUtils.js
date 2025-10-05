/**
 * Mathematical utility functions for linkage calculations
 */
export class MathUtils {
  static constrain(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  static map(value, start1, stop1, start2, stop2) {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
  }

  static lerp(start, stop, amt) {
    return start + (stop - start) * amt;
  }

  static dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }

  static radians(degrees) {
    return (degrees * Math.PI) / 180;
  }

  static degrees(radians) {
    return (radians * 180) / Math.PI;
  }
}