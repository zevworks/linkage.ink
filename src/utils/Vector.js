/**
 * Simple 2D Vector class for mathematical operations
 */
export class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  static create(x, y) {
    return new Vector(x, y);
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }

  div(scalar) {
    this.x /= scalar;
    this.y /= scalar;
    return this;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  normalize() {
    const m = this.mag();
    if (m !== 0) {
      this.div(m);
    }
    return this;
  }

  static sub(v1, v2) {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  static add(v1, v2) {
    return new Vector(v1.x + v2.x, v1.y + v2.y);
  }

  static mult(v, scalar) {
    return new Vector(v.x * scalar, v.y * scalar);
  }

  static dist(v1, v2) {
    return Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2);
  }
}