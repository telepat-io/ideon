import '@testing-library/jest-dom';
import { jest } from '@jest/globals';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => {
    // Simulate a 1280px wide desktop viewport so Ant Design Grid.useBreakpoint()
    // returns { lg: true } and Layout.Sider renders in tests.
    let matches = false;
    const minWidthMatch = /\(min-width:\s*(\d+)px\)/.exec(query);
    const maxWidthMatch = /\(max-width:\s*(\d+)px\)/.exec(query);
    const viewportWidth = 1280;
    if (minWidthMatch) {
      matches = viewportWidth >= Number(minWidthMatch[1]);
    } else if (maxWidthMatch) {
      matches = viewportWidth <= Number(maxWidthMatch[1]);
    }

    return {
      matches,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as MediaQueryList;
  },
});

Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: (callback: FrameRequestCallback) => window.setTimeout(() => callback(Date.now()), 0),
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: (handle: number) => window.clearTimeout(handle),
});

Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: jest.fn(async () => undefined),
  },
});

class ResizeObserverMock {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

class IntersectionObserverMock {
  observe(): void {}

  unobserve(): void {}

  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: IntersectionObserverMock,
});

// Ant Design's Grid.useBreakpoint() uses window.innerWidth to compute breakpoints.
// jsdom defaults to 0, making isMobile=true and hiding the sidebar in tests.
// Set a desktop-width viewport so Layout.Sider renders and sidebar content is queryable.
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1280,
});