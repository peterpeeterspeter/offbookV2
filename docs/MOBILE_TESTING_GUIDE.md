# Mobile Testing Guide

## Overview

This guide covers the mobile testing infrastructure for OFFbook v2, including device detection, accessibility testing, performance profiling, and browser compatibility testing.

## Table of Contents

1. [Test Infrastructure](#test-infrastructure)
2. [Device Detection](#device-detection)
3. [Accessibility Testing](#accessibility-testing)
4. [Performance Profiling](#performance-profiling)
5. [Browser Compatibility](#browser-compatibility)
6. [Test Utilities](#test-utilities)

## Test Infrastructure

### Directory Structure

```
/src/tests/mobile/
  ├── __init__.py
  ├── utils.py
  ├── test_touch_interactions.py
  ├── test_battery_monitoring.py
  ├── test_screen_orientation.py
  └── test_mobile_audio.py
```

### Setup Requirements

1. Node.js 18+
2. TypeScript 5.0+
3. Jest with ts-jest
4. Mobile browser testing tools (Playwright/Puppeteer)

### Environment Configuration

```typescript
// mobile-test-config.ts
export const mobileTestConfig = {
  devices: ["iPhone 12", "Pixel 5", "iPad Pro"],
  orientations: ["portrait", "landscape"],
  browsers: ["Safari", "Chrome", "Firefox"],
  viewport: {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
};
```

## Device Detection

### Test Coverage Areas

1. Device Type Identification

   - Mobile vs Tablet detection
   - Screen size detection
   - Device capabilities

2. Feature Detection
   - Touch support
   - Accelerometer
   - Gyroscope
   - WebGL support

### Example Test

```typescript
describe("DeviceDetector", () => {
  test("correctly identifies mobile device", async () => {
    const detector = new DeviceDetector();
    const info = await detector.getDeviceInfo();

    expect(info.type).toBe("mobile");
    expect(info.capabilities.touch).toBe(true);
    expect(info.screen.width).toBeLessThan(768);
  });
});
```

## Accessibility Testing

### Key Test Areas

1. ARIA Compliance

   - Labels and descriptions
   - Role attributes
   - State management

2. Touch Targets

   - Minimum size requirements
   - Spacing between elements
   - Hit area testing

3. Screen Reader Support
   - Content announcement
   - Navigation order
   - Dynamic updates

### Example Test

```typescript
describe("AccessibilityTests", () => {
  test("touch targets meet size requirements", () => {
    const tester = new AccessibilityTester();
    const results = tester.checkTouchTargets();

    expect(results.violations).toHaveLength(0);
    expect(results.targets).toAllMeetCriteria({
      minWidth: 44,
      minHeight: 44,
      spacing: 8,
    });
  });
});
```

## Performance Profiling

### Metrics Tracked

1. Memory Usage

   - Heap snapshots
   - Memory leaks
   - Garbage collection

2. Battery Impact

   - Power consumption
   - Background usage
   - Optimization opportunities

3. Network Efficiency
   - Request timing
   - Payload sizes
   - Caching effectiveness

### Example Test

```typescript
describe("PerformanceTests", () => {
  test("memory usage stays within limits", async () => {
    const profiler = new PerformanceProfiler();
    await profiler.startProfiling();

    // Perform actions
    const results = await profiler.stopProfiling();

    expect(results.memory.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
    expect(results.memory.leaks).toHaveLength(0);
  });
});
```

## Browser Compatibility

### Test Matrix

| Feature        | Safari iOS | Chrome Android | Firefox Mobile |
| -------------- | ---------- | -------------- | -------------- |
| WebRTC         | ✓          | ✓              | ✓              |
| WebGL          | ✓          | ✓              | ✓              |
| Audio Worklet  | ✓          | ✓              | ✓              |
| IndexedDB      | ✓          | ✓              | ✓              |
| Service Worker | ✓          | ✓              | ✓              |

### Example Test

```typescript
describe("BrowserCompatibility", () => {
  test("audio features work across browsers", async () => {
    const tester = new BrowserCompatibilityTester();
    const results = await tester.testAudioSupport();

    expect(results.audioContext).toBe(true);
    expect(results.worklet).toBe(true);
    expect(results.mediaDevices).toBe(true);
  });
});
```

## Test Utilities

### Helper Functions

```typescript
// utils/mobile-test-helpers.ts
export const simulateTouch = async (element: Element, x: number, y: number) => {
  const touchEvent = new TouchEvent("touchstart", {
    touches: [{ clientX: x, clientY: y }],
  });
  element.dispatchEvent(touchEvent);
};

export const mockBatteryAPI = (level: number) => {
  return {
    level,
    charging: false,
    addEventListener: jest.fn(),
  };
};
```

### Common Assertions

```typescript
// utils/mobile-assertions.ts
expect.extend({
  toBeAccessible(element) {
    const violations = checkAccessibility(element);
    return {
      pass: violations.length === 0,
      message: () => `Found accessibility violations: ${violations.join(", ")}`,
    };
  },
});
```

## Best Practices

1. Always test on real devices when possible
2. Use device emulation for initial testing
3. Test in both orientations
4. Verify touch interactions
5. Monitor performance metrics
6. Test offline functionality
7. Verify accessibility compliance
8. Check browser compatibility
9. Test responsive layouts
10. Validate error handling

## Troubleshooting

Common issues and solutions:

1. Touch events not firing

   - Verify touch simulation setup
   - Check event propagation
   - Validate touch area size

2. Performance test failures

   - Review memory thresholds
   - Check for memory leaks
   - Validate test environment

3. Browser compatibility issues
   - Check feature detection
   - Verify polyfills
   - Test fallback behavior
